var app = app || {}

app.audio = (function () {

    "use strict";

    // the three songs that are available
    const SOUND_PATH = Object.freeze({
        sound1: "media/New Adventure Theme.mp3",
        sound2: "media/Peanuts Theme.mp3",
        sound3: "media/The Picard Song.mp3"
    });

    let audioElement;
    let audioCtx;
    let sourceNode, analyserNode, gainNode, highshelfBiquadFilter;

    const NUM_SAMPLES = 256;
    // audio data is held in an array of 8-bit integers (0-255)
    let audioData = new Uint8Array(NUM_SAMPLES / 2);

    // visualization and audio node options
    let highshelf = false;
    let showLines = false;
    let showQuadCurves = false;
    let showCubicCurves = false;
    let showBars = false;

    // positions of the points of the audio visualizations, used for flock methods
    // data is held in [x1, y1, x2, y2, x3, y3, ...] form
    let pathPoints = [];

    // flockers spread out when the average frequency/waveform values exceed the beat threshold
    const DEFAULT_BEAT_THRESHOLD = 160; // beat threshold starts at default and is then calibrated over time
    let beatThreshold = DEFAULT_BEAT_THRESHOLD;
    let beatOverThreshold = false;
    let beatZero = false; // true if the average is 0

    let useWaveform = false; // use waveform data instead of frequency data
    // waveform data visualization is too fast, so only change it every 15 frames
    let waveFormTimer = 0;
    const WAVEFORM_DELAY_TIME = 15;

    function setupWebaudio() {
        // The || is because WebAudio has not been standardized across browsers yet
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        audioElement = document.querySelector("audio");
        audioElement.src = SOUND_PATH.sound1;

        // create a source node that points at the <audio> element
        sourceNode = audioCtx.createMediaElementSource(audioElement);

        // create an analyser node
        analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = NUM_SAMPLES;

        // create a gain (volume) node
        gainNode = audioCtx.createGain();
        gainNode.gain.value = 1;

        // create a highshelf node
        highshelfBiquadFilter = audioCtx.createBiquadFilter();
        highshelfBiquadFilter.type = "highshelf";
        highshelfBiquadFilter.gain.setValueAtTime(0, audioCtx.currentTime);

        // connect the nodes
        sourceNode.connect(analyserNode);
        analyserNode.connect(gainNode);
        gainNode.connect(highshelfBiquadFilter);
        highshelfBiquadFilter.connect(audioCtx.destination);
    }

    function update(ctx, centerX = 320, centerY = 240, radius = 50) {
        if (!useWaveform) {
            analyserNode.getByteFrequencyData(audioData);
        }
        // if we've already gotten the waveform data recently, increment the timer
        else if (waveFormTimer > 0) { 
            waveFormTimer++;
            if (waveFormTimer >= WAVEFORM_DELAY_TIME) {
                waveFormTimer = 0;
            }
        }
        else { // otherwise get the waveform data
            waveFormTimer = 1;
            analyserNode.getByteTimeDomainData(audioData);
        }

        // reset the pathpoints
        pathPoints = [];

        ctx.save();
        ctx.strokeStyle = "rgb(250, 250, 255)"; // mostly white, but with a little more blue 
                                                // to look better with pixel manipulations
        ctx.lineWidth = 1;
        ctx.beginPath();

        // draw audio visualizations around a circle
        let angle = 0;
        let anglePerIter = (2 * Math.PI) / audioData.length;
        let total = 0; // save the total for calculating the average later

        for (let i = 0; i < audioData.length; i++) {
            let x = centerX + Math.cos(angle) * (radius + audioData[i] / 1.5);
            let y = centerY + Math.sin(angle) * (radius + audioData[i] / 1.5);

            // draw lines based on chosen visualization option
            if (showLines) {
                if (i == 0) {
                    ctx.moveTo(x, y);
                }
                else {
                    ctx.lineTo(x, y);
                }
            }
            else if (showQuadCurves) {
                if (i == 0) {
                    ctx.moveTo(x, y);
                }
                else {
                    ctx.quadraticCurveTo(centerX, centerY, x, y);
                }
            }
            else if (showCubicCurves) {
                if (i == 0) {
                    ctx.moveTo(x, y);
                }
                else {
                    ctx.bezierCurveTo(x, y, centerX, centerY, x, y);
                }
            }
            else if (showBars) {
                let height = radius + audioData[i] / 1.5
                let width = (Math.PI * radius) / 360;
                ctx.fillStyle = "rgb(250, 250, 255)";
                ctx.fillRect(x, y, width, height);
            }

            // save the calculated point
            pathPoints.push(x);
            pathPoints.push(y);

            angle += anglePerIter;
            total += audioData[i];
        }

        ctx.closePath();
        if (showLines || showQuadCurves || showCubicCurves) {
            ctx.stroke();
        }

        // stroke a white circle in the center for every option except bars
        if (!showBars) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, false);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }

        // calculate the average frequency/waveform data so flock can spread out on beat
        let average = total / audioData.length;
        if (average == 0) {
            beatZero = true;
        }
        else if (average >= beatThreshold) {
            beatOverThreshold = true;
            beatZero = false;
        }
        else {
            beatOverThreshold = false;
            beatZero = false;
        }
    }

    function getBeatOverThreshold() {
        return beatOverThreshold;
    }

    function getBeatZero() {
        return beatZero;
    }

    function getAudioElement() {
        return audioElement;
    }

    function getAudioContext() {
        return audioCtx;
    }

    function getPathPoints() {
        return pathPoints;
    }

    function getAudioDataLength() {
        return audioData.length;
    }

    // maps value from 0-100 to 0-2
    function setVolume(volume) {
        volume = volume / 50;
        gainNode.gain.value = volume;
    }

    function setDrawOption(option) {
        if (option == "Lines") {
            showLines = true;
            showBars = false;
            showQuadCurves = false;
            showCubicCurves = false;
        }
        else if (option == "QuadCurves") {
            showLines = false;
            showBars = false;
            showQuadCurves = true;
            showCubicCurves = false;
        }
        else if (option == "CubicCurves") {
            showLines = false;
            showBars = false;
            showQuadCurves = false;
            showCubicCurves = true;
        }
        else if (option == "Bars") {
            showLines = false;
            showBars = true;
            showQuadCurves = false;
            showCubicCurves = false;
        }
        else {
            showLines = false;
            showBars = false;
            showQuadCurves = false;
            showCubicCurves = false;
        }
    }

    function toggleHighshelf() {
        highshelf = !highshelf;
        if (highshelf) {
            highshelfBiquadFilter.frequency.setValueAtTime(1000, audioCtx.currentTime);
            highshelfBiquadFilter.gain.setValueAtTime(10, audioCtx.currentTime);
        }
        else {
            highshelfBiquadFilter.gain.setValueAtTime(0, audioCtx.currentTime);
        }
    }

    function decrementBeatThreshold(num) {
        beatThreshold -= num;
    }

    function incrementBeatThreshold(num) {
        beatThreshold += num;
    }

    function resetBeatThreshold() {
        beatThreshold = DEFAULT_BEAT_THRESHOLD;
    }

    function useWaveformData(val) {
        useWaveform = val;
    }


    return {
        setupWebaudio,
        decrementBeatThreshold,
        incrementBeatThreshold,
        resetBeatThreshold,
        getAudioElement,
        getAudioContext,
        getPathPoints,
        getAudioDataLength,
        getBeatOverThreshold,
        getBeatZero,
        setVolume,
        setDrawOption,
        useWaveformData,
        toggleHighshelf,
        update
    }

})();