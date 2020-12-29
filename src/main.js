var app = app || {}

app.main = (function () {

    "use strict";
    let canvasElement;
    let ctx;
    let canvasWidth;
    let canvasHeight;

    // for pixel manipulations
    let invert = false;
    let sepia = false;

    function init()
    {
        setupCanvas();
        canvasWidth = canvasElement.width;
        canvasHeight = canvasElement.height;

        app.audio.setupWebaudio();
        app.ui.setupUI();
        app.flockmanager.setupFlocks();

        update();
    }

    function setupCanvas()
    {
        canvasElement = document.querySelector("canvas");
        ctx = canvasElement.getContext("2d");
    }

    // main loop
    function update()
    {
        requestAnimationFrame(update);

        ctx.save();

        // start each frame with a mostly black background 
        // a little blue so pixel manipulations have a bigger effect
        ctx.fillStyle = "rgb(0, 0, 5)";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.restore();

        // calculate the center of the canvas and a reasonable radius for drawing audio lines
        let centerX = canvasWidth / 2;
        let centerY = canvasHeight / 2;
        let radius = canvasHeight / 6;
        app.audio.update(ctx, centerX, centerY, radius);

        app.flockmanager.updateAllFlocks();

        // manipulate pixels using chosen pixel options
        let pixelOptions = [];
        if(invert) pixelOptions.push("invert");
        if(sepia) pixelOptions.push("sepia");
        app.utilities.manipulatePixels(ctx, pixelOptions);

    }

    function getCanvasElement()
    {
        return canvasElement;
    }

    function getContext()
    {
        return ctx;
    }

    function getCanvasDims()
    {
        let dimensions = [canvasWidth, canvasHeight];
        return dimensions;
    }

    function toggleInvert()
    {
        invert = !invert;
    }

    function toggleSepia()
    {
        sepia = !sepia;
    }


    return {
        init,
        getCanvasElement,
        getContext,
        getCanvasDims,
        toggleInvert,
        toggleSepia
    }

})();