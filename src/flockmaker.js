var app = app || {}

app.flockmaker = (function () {

    "use strict";

    // factory function for creating flocks
    function createFlock() {
        let flock = {};

        // relative weights for how much each type of force affects the flockers
        flock.defaultSeperateWeight = 32;
        flock.defaultPathFindWeight = 20;
        flock.seperateWeight = flock.defaultSeperateWeight;
        flock.cohesionWeight = 14;
        flock.alignmentWeight = 20;
        flock.pathfindWeight = flock.defaultPathFindWeight;

        flock.defaultMaxForce = 0.35; // the amount of force that can be applied to a flocker at once
        flock.defaultMaxSpeed = 5; // the maximum speed a flocker can move at
        flock.maxSpeed = flock.defaultMaxSpeed;
        flock.maxForce = flock.defaultMaxForce;

        flock.distToAlign = 23; // minimum distance flockers must be from the average position before they'll
                                // start to move in a similar direction
        flock.defaultMaxSeperateDistance = 15; // maximum distance flockers must be from each other in order to
                                               // seperate from each other
        flock.maxSeperateDistance = flock.defaultMaxSeperateDistance;

        flock.averagePos = app.utilities.createVector(); 
        flock.averageDir = app.utilities.createVector(); 

        flock.flockers = [];

        flock.pathPos = 0; // index of where the flock is among the path points
        flock.minPathpointDist = 5; // margin of error for moving between path points

        // for having the flock scatter to form the outline of the audio data
        flock.scatterPoints = []; // holds positions of random points of the audio data visualization
        flock.scattering = false;
        flock.scatterTimer = 0;
        flock.scatterTime = 70; // how long the flock remains scattered before coming back together

        // for having the flock spread apart when the average frequency/waveform exceeds beat threshold
        flock.beatSeperating = false;
        flock.beatSeperateTimer = 0;
        flock.beatSeperateTime = 15; // how long the flock remains spread apart before coming back together
        flock.delayTimer = 0;
        flock.delayTime = 15; // how long the flock must remain normal after seperating before it can seperate again

        flock.color = "red";

        // factory function for creating flockers
        flock.createFlocker = function (position = app.utilities.createVector()) {
            let f = {};
            f.pos = position;
            f.vel = app.utilities.createVector();
            f.accel = app.utilities.createVector();
            f.dir = app.utilities.createVector();

            f.update = function () {
                this.getSumForces();
                this.updatePosition();
            };

            f.applyForce = function (force) {
                this.accel = this.accel.add(force);
            };

            f.getSumForces = function () {
                if (flock.scattering) return; // updateFlockers() will apply scatter force

                let sumForces = app.utilities.createVector();

                // apply alignment force if the flocker is close enough to the flock's average position
                let distFromAve = (this.pos.subtract(flock.averagePos)).magnitude();
                if (distFromAve < flock.distToAlign) {
                    let alignmentForce = (this.alignment()).mult(flock.alignmentWeight);
                    sumForces = sumForces.add(alignmentForce);
                }

                // apply weighted forces
                let cohesionForce = (this.cohesion()).mult(flock.cohesionWeight);
                sumForces = sumForces.add(cohesionForce);

                let seperateForce = (this.seperate()).mult(flock.seperateWeight);
                sumForces = sumForces.add(seperateForce);

                let pathFindForce = (this.pathfind()).mult(flock.pathfindWeight);
                sumForces = sumForces.add(pathFindForce);

                sumForces = (sumForces.normalize()).mult(flock.maxForce);

                this.applyForce(sumForces);
            };

            f.updatePosition = function () {
                // update velocity
                this.vel = this.vel.add(this.accel);

                // clamp the magnitude of the velocity to the flock.maxSpeed
                if (this.vel.magnitude() > flock.maxSpeed) {
                    this.vel = this.vel.normalize();
                    this.vel = this.vel.mult(flock.maxSpeed);
                }

                // update position, direction
                this.pos = this.pos.add(this.vel);
                this.dir = this.vel.normalize();
                this.accel = app.utilities.createVector(); // reset acceleration to 0
            };

            // move the flocker toward a given position
            f.seek = function (targetPos) {
                let distance = targetPos.subtract(this.pos);
                let dirToTarget = distance.normalize();
                let desiredVelocity = dirToTarget.mult(flock.maxSpeed);
                let steeringForce = desiredVelocity.subtract(this.vel);
                steeringForce = steeringForce.normalize();
                return steeringForce;
            };

            // move the flocker away from a given position
            f.flee = function (targetPos) {
                let desiredVelocity = ((this.pos.subtract(targetPos)).normalize()).mult(flock.maxSpeed);
                let steeringForce = desiredVelocity.subtract(this.vel);
                return steeringForce.normalize();
            }

            // move towards the next point on the path defined by the audio data
            f.pathfind = function () {
                let path = app.audio.getPathPoints();
                let pathPoint = app.utilities.createVector(path[flock.pathPos], path[flock.pathPos + 1]);
                let distFromPoint = (this.pos.subtract(pathPoint)).magnitude();

                // find the next path point that's far enough away
                while (distFromPoint < flock.minPathpointDist) {
                    flock.pathPos += 2;
                    if (flock.pathPos >= path.length - 1) flock.pathPos = 0;
                    pathPoint = app.utilities.createVector(path[flock.pathPos], path[flock.pathPos + 1]);
                    distFromPoint = (this.pos.subtract(pathPoint)).magnitude();
                }

                // move towards the chosen path point
                return this.seek(pathPoint);
            };

            // move closer to the average direction of the flock
            f.alignment = function () {
                let desiredVelocity = flock.averageDir.mult(flock.maxSpeed);
                let steeringForce = desiredVelocity.subtract(this.vel);
                return steeringForce;
            };

            // move towards the average position of the flock
            f.cohesion = function () {
                let steeringForce = this.seek(flock.averagePos);
                return steeringForce;
            };

            // move away from fellow flockers so they don't overlap
            f.seperate = function () {
                let seperateForce = app.utilities.createVector();
                for (let i = 0; i < flock.flockers.length; i++) {
                    let distance = (this.pos.subtract(flock.flockers[i].pos)).magnitude();
                    if (distance <= flock.maxSeperateDistance && distance > 0) {
                        seperateForce = seperateForce.add(this.flee(flock.flockers[i].pos));
                    }
                }

                return seperateForce.normalize();
            };

            // draw the flocker to the canvas
            f.render = function (ctx) {
                ctx.save();
                if (flock.color != "gradient") {
                    ctx.fillStyle = flock.color;
                }
                else {
                    let gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, ctx.canvas.height);
                    gradient.addColorStop(0, "rgb(206, 0, 206");
                    gradient.addColorStop(0.45, "rgb(55, 99, 242");
                    gradient.addColorStop(0.55, "rgb(64, 211, 44");
                    gradient.addColorStop(1, "rgb(221, 83, 0");

                    ctx.fillStyle = gradient;
                }
                ctx.beginPath();
                ctx.arc(this.pos.x, this.pos.y, 3, 0, Math.PI * 2, false); // flockers appear as circles with radius 3
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            this.flockers.push(f);
        };

        // update the average position and direction of the flock
        flock.updateAverages = function () {
            let totalPosition = app.utilities.createVector();
            let totalDirection = app.utilities.createVector();

            for (let i = 0; i < this.flockers.length; i++) {
                totalPosition = totalPosition.add(this.flockers[i].pos);
                totalDirection = totalDirection.add(this.flockers[i].dir);
            }

            this.averagePos = totalPosition.mult((1 / this.flockers.length));
            this.averageDir = totalDirection.mult((1 / this.flockers.length));
        };

        flock.updateFlockers = function (ctx) {
            for (let i = 0; i < this.flockers.length; i++) {

                // if scattering, apply scatter force to each flocker
                if (this.scattering) {
                    let scatterIndex = 0;

                    // make sure scatter index will be in range before incrementing it
                    if (this.scatterPoints[i * 2] && this.scatterPoints[i * 2 + 1]) {
                        scatterIndex = i * 2;
                    }

                    // give each flocker a scatter point to seek
                    let scatterForce = this.flockers[i].seek(app.utilities.createVector(this.scatterPoints[scatterIndex], this.scatterPoints[scatterIndex + 1]));
                    scatterForce = (scatterForce.normalize()).mult(flock.maxForce);
                    this.flockers[i].applyForce(scatterForce);
                }

                // update and draw the flockers
                this.flockers[i].update();
                this.flockers[i].render(ctx);
            }

            // update scatter timer
            if (this.scattering) {
                if (this.scatterTimer >= this.scatterTime) {
                    this.scatterTimer = 0;
                    this.scattering = false;
                    this.maxForce = this.defaultMaxForce;
                    this.maxSpeed = this.defaultMaxSpeed;
                }
                else {
                    this.scatterTimer++;
                }
            }

            // update beat seperate timer
            if (this.beatSeperating) {
                if (this.beatSeperateTimer >= this.beatSeperateTime) {
                    this.beatSeperateTimer = 0;
                    this.beatSeperating = false;

                    // return to defaults
                    this.seperateWeight = this.defaultSeperateWeight;
                    this.maxSeperateDistance = this.defaultMaxSeperateDistance;
                    this.pathFindWeight = this.defaultPathFindWeight;
                    this.delayTimer = 1; // start the delay timer
                }
                else {
                    this.beatSeperateTimer++;
                }
            }
            else if (this.delayTimer > 0) { // if delaying update delay timer
                this.delayTimer++;
                if (this.delayTimer > this.delayTime) this.delayTimer = 0;
            }

        };

        flock.updateFlock = function () {
            this.updateAverages();
            this.updateFlockers(app.main.getContext());
        };

        // create a given number of flockers at random positions on the canvas
        flock.createFlockers = function (num = 50) {
            let canvasDims = app.main.getCanvasDims();

            for (let i = 0; i < num; i++) {
                let x = Math.random() * canvasDims[0];
                let y = Math.random() * canvasDims[1];
                this.createFlocker(app.utilities.createVector(x, y));
            }
        };

        // set up scattering for flockers so they can form an outline of the audio data
        flock.scatter = function () {
            this.scattering = true;

            // increase max force and speed so flockers can quickly form the outline
            this.maxForce = 5;
            this.maxSpeed = 15;

            // get random audio data points to make up scatter points
            this.scatterPoints = [];
            let path = app.audio.getPathPoints();
            for (let i = 0; i < this.flockers.length; i++) {
                let randIndex = Math.floor(Math.random() * path.length);
                if (randIndex % 2 != 0) randIndex--; // if random index is not on an x-value, move it to an x-value
                if (randIndex >= path.length - 1) randIndex = path.length - 2; // make sure random index is in range
                this.scatterPoints.push(path[randIndex]);
                this.scatterPoints.push(path[randIndex + 1]);
            }
        };

        // increase seperate weight and max seperate distance so flockers become more spread out 
        flock.beatSeperate = function () {
            if (this.delayTimer > 0) return; // can't beat seperate if already beat seperated recently
            this.beatSeperating = true;
            this.seperateWeight = 35;
            this.pathFindWeight = 30; // also increase pathfind weight so spread out flockers still follow the path
            this.maxSeperateDistance = 30;
        };

        flock.setNumFlockersTo = function (num) {
            if (num == this.flockers.length) return;

            if (num > this.flockers.length) {
                let iter = num - this.flockers.length;
                for (let i = 0; i < iter; i++) {
                    this.createFlocker();
                }
            }
            else if (num < this.flockers.length) {
                let iter = this.flockers.length - num;
                for (let i = 0; i < iter; i++) {
                    this.flockers.pop();
                }
            }
        }

        flock.setColor = function (color) {
            this.color = color;
        }

        return flock;
    }

    return {
        createFlock
    }

})();