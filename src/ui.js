var app = app || {}

app.ui = (function () {

    "use strict";

    function setupUI(){

        let audioCtx = app.audio.getAudioContext();
        let audioElement = app.audio.getAudioElement();

        // create object holding map of all dat.gui controls with their starting values
        let obj = {
            "Volume": 50,
            "Flocks": 2,
            "Flockers/Flock": 40,
            "Draw Option": "None",
            "Flocker Color": 'red',
            "Audio Data": 'Frequency',
            "Invert": false,
            "Sepia": false,
            "Highshelf Filter": false
        };

        // create dat.gui interface for controls
        let gui = new dat.gui.GUI();
        let flockFolder = gui.addFolder("Flock");
        let audioFolder = gui.addFolder("Audio");
        let pixelFolder = gui.addFolder("Pixel");

        // audio controls
        let volumeController = audioFolder.add(obj, 'Volume').min(0).max(100).step(1);
        let audioDataOptions = ["Frequency", "Waveform"];
        let audioDataController = audioFolder.add(obj, 'Audio Data', audioDataOptions);
        let audioDrawOptions = ["None", "Lines", "QuadCurves", "CubicCurves", "Bars"];
        let drawOptionsController = audioFolder.add(obj, 'Draw Option', audioDrawOptions);
        let highshelfController = audioFolder.add(obj, "Highshelf Filter");

        // flock controls
        let flockController = flockFolder.add(obj, 'Flocks').min(1).max(3).step(1);
        let flockerController = flockFolder.add(obj, 'Flockers/Flock').min(30).max(50).step(1);
        let colors = ["red", "blue", "yellow", "green", "gradient"]
        let flockerColorController = flockFolder.add(obj, 'Flocker Color', colors);

        // pixel controls
        let invertController = pixelFolder.add(obj, "Invert");
        let sepiaController = pixelFolder.add(obj, "Sepia")

        // events for each control change
        volumeController.onChange(function(value) {
            app.audio.setVolume(value);
        });

        highshelfController.onChange(function(value) {
            app.audio.toggleHighshelf();
        });

        audioDataController.onChange(function(value) {
            if(value == "Frequency")
            {
                app.audio.useWaveformData(false);
            }
            else if(value == "Waveform")
            {
                app.audio.useWaveformData(true);
            }
        });

        drawOptionsController.onChange(function(value) {
            app.audio.setDrawOption(value); 
        });

        flockController.onChange(function(value) {
            app.flockmanager.setNumFlocksTo(value);
        });

        flockerController.onChange(function(value) {
            app.flockmanager.setAllNumFlockersTo(value);
        });

        flockerColorController.onChange(function(value) {
            app.flockmanager.setFlockColors(value);
        });

        invertController.onChange(function(value) {
            app.main.toggleInvert();
        });

        sepiaController.onChange(function(value) {
            app.main.toggleSepia();
        });

        // non-dat.gui controls
        document.querySelector("#trackSelect").onchange = e =>{
            audioElement.src = e.target.value;
            app.audio.resetBeatThreshold();
        };
        
        document.querySelector("#fsButton").onclick = _ =>{
            requestFullscreen(app.main.getCanvasElement());
        };

        // scatter flocks on click
        let canvasElement = app.main.getCanvasElement();
        canvasElement.addEventListener('click', app.flockmanager.scatterAllFlocks);
    }

    function requestFullscreen(element) {
        if (element.requestFullscreen) {
          element.requestFullscreen();
        } else if (element.mozRequestFullscreen) {
          element.mozRequestFullscreen();
        } else if (element.mozRequestFullScreen) { // camel-cased 'S' was changed to 's' in spec
          element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
          element.webkitRequestFullscreen();
        }
        // .. and do nothing if the method is not supported
    };

    return {
        setupUI
    }

})();