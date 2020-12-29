var app = app || {}

app.flock = (function () {

    "use strict";

    let defaultPos;

    const SEPERATE_WEIGHT = 35;
    const COHESION_WEIGHT = 14;
    const ALIGNMENT_WEIGHT = 20;
    const PATHFIND_WEIGHT = 20;
    const DEFAULT_MAXSPEED = 4;
    const DEFAULT_MAXFORCE = 0.25;

    let distToAlign = 25;
    let maxSeperateDistance = 15;
    let maxSpeed = DEFAULT_MAXSPEED;
    let maxForce = DEFAULT_MAXFORCE;


    let averagePos = app.utilities.createVector();
    let averageDir = app.utilities.createVector();

    let flockers = [];
    let pathPos = 0;
    const MIN_PATHPOINT_DIST = 3;

    let scatterPoints = [];
    let scattering = false;
    let scatterTimer = 0;
    const SCATTER_TIME = 90;


    function createFlocker(position = app.utilities.createVector())
    {
        let f = {};
        f.pos = position;
        f.vel = app.utilities.createVector();
        f.accel = app.utilities.createVector();
        f.dir = app.utilities.createVector();

        f.update = function()
        {
            this.getSumForces();
            this.updatePosition();
        };

        f.applyForce = function(force)
        {
            this.accel = this.accel.add(force);
        };

        f.getSumForces = function()
        {
            if(scattering) return; // updateFlockers() will apply scatter force

            let sumForces = app.utilities.createVector();

            let distFromAve = (this.pos.subtract(averagePos)).magnitude();
            if(distFromAve < distToAlign)
            {
                let alignmentForce = (this.alignment()).mult(ALIGNMENT_WEIGHT);
                sumForces = sumForces.add(alignmentForce);
            }

            let cohesionForce = (this.cohesion()).mult(COHESION_WEIGHT);
            sumForces = sumForces.add(cohesionForce);

            let seperateForce = (this.seperate()).mult(SEPERATE_WEIGHT);
            sumForces = sumForces.add(seperateForce);
            
            let pathFindForce = (this.pathfind()).mult(PATHFIND_WEIGHT);
            sumForces = sumForces.add(pathFindForce);

            sumForces = (sumForces.normalize()).mult(maxForce);

            this.applyForce(sumForces);
        };

        f.updatePosition = function()
        {
            // update velocity
            this.vel = this.vel.add(this.accel);

            // clamp the magnitude of the velocity to the maxspeed
            if(this.vel.magnitude() > maxSpeed)
            {
                this.vel = this.vel.normalize();
                this.vel = this.vel.mult(maxSpeed);
            }

            this.pos = this.pos.add(this.vel);
            this.dir = this.vel.normalize();
            this.accel = app.utilities.createVector();
        };

        f.seek = function(targetPos)
        {
            let distance = targetPos.subtract(this.pos);

            let dirToTarget = distance.normalize();

            let desiredVelocity = dirToTarget.mult(maxSpeed);

            let steeringForce = desiredVelocity.subtract(this.vel);

            steeringForce = steeringForce.normalize();

            return steeringForce;
        };

        f.flee = function(targetPos)
        {
            let desiredVelocity = ((this.pos.subtract(targetPos)).normalize()).mult(maxSpeed);
            let steeringForce = desiredVelocity.subtract(this.vel);
            return steeringForce.normalize();
        }

        f.pathfind = function()
        {
            let path = app.audio.getPathPoints();
            let pathPoint = app.utilities.createVector(path[pathPos], path[pathPos + 1]);
            let distFromPoint = (this.pos.subtract(pathPoint)).magnitude();

            while(distFromPoint < MIN_PATHPOINT_DIST)
            {
                pathPos = (pathPos + 2) % path.length;
                pathPoint = app.utilities.createVector(path[pathPos], path[pathPos + 1]);
                distFromPoint = (this.pos.subtract(pathPoint)).magnitude();
            }

            return this.seek(pathPoint);
        };

        f.alignment = function()
        {
            let desiredVelocity = averageDir.mult(maxSpeed);
            let steeringForce = desiredVelocity.subtract(this.vel);
            return steeringForce;
        };

        f.cohesion = function()
        {
            let steeringForce = this.seek(averagePos);
            return steeringForce;
        };

        f.seperate = function()
        {
            let seperateForce = app.utilities.createVector();
            for(let i = 0; i < flockers.length; i++)
            {
                let distance = (this.pos.subtract(flockers[i].pos)).magnitude();
                if(distance <= maxSeperateDistance && distance > 0)
                {
                    seperateForce = seperateForce.add(this.flee(flockers[i].pos));
                }
            }

            return seperateForce.normalize();
        };

        f.render = function(ctx)
        {
            ctx.save();
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, 3, 0, Math.PI * 2, false);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        flockers.push(f);
    }

    function updateAverages()
    {
        let totalPosition = app.utilities.createVector();
        let totalDirection = app.utilities.createVector();

        for(let i = 0; i < flockers.length; i++)
        {
            totalPosition = totalPosition.add(flockers[i].pos);
            totalDirection = totalDirection.add(flockers[i].dir);
        }

        averagePos = totalPosition.mult((1 / flockers.length));
        averageDir = totalDirection.mult((1 / flockers.length));
    }

    function updateFlockers(ctx)
    {
        for(let i = 0; i < flockers.length; i++)
        {
            if(scattering)
            {
                let scatterIndex = 0;
                if(scatterPoints[i * 2] && scatterPoints[i * 2 + 1])
                {
                    scatterIndex = i * 2;
                }

                let scatterForce = flockers[i].seek(app.utilities.createVector(scatterPoints[scatterIndex], scatterPoints[scatterIndex + 1]));
                scatterForce = (scatterForce.normalize()).mult(maxForce);
                flockers[i].applyForce(scatterForce);
            }
            flockers[i].update();
            flockers[i].render(ctx);
        }

        // update timer
        if(scattering)
        {
            if(scatterTimer >= SCATTER_TIME)
            {
                scatterTimer = 0;
                scattering = false;
                maxForce = DEFAULT_MAXFORCE;
                maxSpeed = DEFAULT_MAXSPEED;
            }
            else{
                scatterTimer++;
            }
        }
    }

    function updateFlock()
    {
        updateAverages();
        updateFlockers(app.main.getContext());
    }

    function createFlockers(num = 50)
    {
        let canvasDims = app.main.getCanvasDims();

        for(let i = 0; i < num; i++)
        {
            let x = Math.random() * canvasDims[0];
            let y = Math.random() * canvasDims[1];
            createFlocker(app.utilities.createVector(x, y));
        }
    }

    function scatter()
    {
        scattering = true;
        maxForce = 4;
        maxSpeed = 10;
        scatterPoints = [];

        let path = app.audio.getPathPoints();

        for(let i = 0; i < flockers.length; i++)
        {
            let randIndex = Math.floor(Math.random() * path.length);
            if(randIndex % 2 != 0) randIndex--;
            if(randIndex >= path.length - 1) randIndex = path.length - 2;
            scatterPoints.push(path[randIndex]);
            scatterPoints.push(path[randIndex + 1]);
        }
    }

    return {
        updateFlock,
        createFlocker,
        createFlockers,
        scatter
    }

})();