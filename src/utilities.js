var app = app || {}

app.utilities = (function () {

    "use strict";

    // create vectors that can be used for flocking vector math
    function createVector(x = 0, y = 0) {
        let vector = {};
        vector.x = x;
        vector.y = y;

        vector.add = function (vec2) {
            return createVector(this.x + vec2.x, this.y + vec2.y);
        };

        vector.subtract = function (vec2) {
            return createVector(this.x - vec2.x, this.y - vec2.y);
        };

        vector.mult = function (scalar) {
            return createVector(this.x * scalar, this.y * scalar);
        };

        vector.magnitude = function () {
            return Math.pow(
                Math.pow(this.x, 2) + Math.pow(this.y, 2),
                0.5);
        };

        vector.normalize = function () {
            let newX = 0;
            let newY = 0;
            if (this.magnitude() != 0) {
                newX = this.x / this.magnitude();
                newY = this.y / this.magnitude();
            }

            return createVector(newX, newY);
        };

        return vector;
    }

    // Gets all the pixels on the given canvas, performs some manipulations on them
    // based on the given options, then puts them back on the canvas
    function manipulatePixels(ctx, options) {
        let imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        let data = imageData.data;
        let iter = data.length;

        let i;
        for (i = 0; i < iter; i += 4) {
            if (options.includes("invert")) {
                let red = data[i], green = data[i + 1], blue = data[i + 2];
                data[i] = 255 - red;
                data[i + 1] = 255 - green;
                data[i + 2] = 255 - blue;
            }
            if (options.includes("sepia")) {
                data[i] = Math.min(data[i] * 0.393 + data[i + 1] * 0.769 + data[i + 2] * 0.189, 255);
                data[i + 1] = Math.min(data[i] * 0.349 + data[i + 1] * 0.686 + data[i + 2] * 0.168, 255);
                data[i + 2] = Math.min(data[i] * 0.272 + data[i + 1] * 0.534 + data[i + 2] * 0.131, 255);
            }    
        }

        ctx.putImageData(imageData, 0, 0);
    }


    return {
        createVector,
        manipulatePixels
    }

})();