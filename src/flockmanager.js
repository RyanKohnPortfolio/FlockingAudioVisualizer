var app = app || {}

app.flockmanager = (function () {

    "use strict";

    let flocks = [];

    // flock options
    const MIN_FLOCKS = 1;
    const MAX_FLOCKS = 3;
    const DEFAULT_FLOCKS = 2;
    const MIN_FLOCKERSPERFLOCK = 30;
    const MAX_FLOCKERSPERFLOCK = 50;
    let flockersPerFlock = 40;
    const DEFAULT_COLOR = "red";
    let flockColors = DEFAULT_COLOR;

    // for choosing speed of newly spawned flocks
    const FLOCK_SPEED_OFFSET = 1;
    const MIN_SPEED_OFFSET = 0.5;
    const MIN_SPEED_DIFF = 0.3;
    const MIN_SPEED = 4;
    const MAX_SPEED = 6;

    // for calibrating beat threshold so the flocks spread out on beat no matter what audio is playing
    // flocks spread out when their average frequency/waveform values exceed threshold
    let timeSinceBeatSeperate = 0;
    const TIME_TO_DECREMENT_BEAT_THRESHOLD = 50;
    const BEAT_THRESHOLD_CHANGE = 5;

    function createFlock()
    {
        let newFlock = app.flockmaker.createFlock();
        newFlock.createFlockers(flockersPerFlock);

        // choose a random within-range speed that's enough different from previously made flocks
        // so that the flocks won't be too close together
        let speedOffset = Math.random() * (FLOCK_SPEED_OFFSET - MIN_SPEED_OFFSET) + MIN_SPEED_OFFSET;
        if(Math.random() > 0.5) speedOffset = -speedOffset;
        newFlock.maxSpeed = newFlock.maxSpeed + speedOffset;

        // if there's already a flock
        if(flocks.length > 0)
        {
            // while there is a flock with a speed similar to this flock's speed, get a new random speed
            let overlapping;
            do
            {
                overlapping = false;
                for(let i = 0; i < flocks.length; i++)
                {
                    if(Math.abs(flocks[i].maxSpeed - newFlock.maxSpeed) < MIN_SPEED_DIFF)
                    {
                        overlapping = true;
                        break;
                    }
                }
                if(overlapping)
                {
                    let speedOffset = Math.random() * (FLOCK_SPEED_OFFSET - MIN_SPEED_OFFSET) + MIN_SPEED_OFFSET;
                    if(Math.random() > 0.5) speedOffset = -speedOffset;
                    newFlock.maxSpeed = newFlock.maxSpeed + speedOffset;            
                }
            }
            while(overlapping && newFlock.maxSpeed <= MAX_SPEED && newFlock.maxSpeed >= MIN_SPEED)
        }

        newFlock.setColor(flockColors);
        flocks.push(newFlock);
    }

    function updateAllFlocks()
    {
        let overThreshold = app.audio.getBeatOverThreshold(); // true if the average frequency/waveform 
                                                              // is over the beat threshold
        let beatZero = app.audio.getBeatZero(); // true if the average frequency/waveform is 0

        // if the beat threshold hasn't been exceeded and the audio is playing (it's not 0)
        if(!overThreshold && !beatZero)
        {
            // increment the timer. If the beat threshold hasn't been exceeded for a while,
            // decrement the beat threshold and reset the timer
            timeSinceBeatSeperate++;
            if(timeSinceBeatSeperate >= TIME_TO_DECREMENT_BEAT_THRESHOLD)
            {
                app.audio.decrementBeatThreshold(BEAT_THRESHOLD_CHANGE);
                timeSinceBeatSeperate = 0;
            }
        }
        // if the beat threshold has been exceeded, increment the threshold
        else if(overThreshold && !beatZero)
        {
            app.audio.incrementBeatThreshold(BEAT_THRESHOLD_CHANGE);
            timeSinceBeatSeperate = 0;
        }
        else // if the music stopped playing, reset the timer
        {
            timeSinceBeatSeperate = 0;
        }

        for(let i = 0; i < flocks.length; i++)
        {
            flocks[i].updateFlock();
            if(overThreshold) flocks[i].beatSeperate();
        }
    }

    // When flocks scatter they spread out to form the outline of the audio data
    function scatterAllFlocks()
    {
        for(let i = 0; i < flocks.length; i++)
        {
            flocks[i].scatter();
        }
    }

    function setNumFlocksTo(num)
    {
        if(num == flocks.length) return;

        if(num > flocks.length && num <= MAX_FLOCKS)
        {
            let iter = num - flocks.length;
            for(let i = 0; i < iter; i++)
            {
                createFlock();
            }
        }
        else if(num < flocks.length && num >= MIN_FLOCKS)
        {
            let iter = flocks.length - num;
            for(let i = 0; i < iter; i++)
            {
                flocks.pop();
            }
        }
    }

    function setAllNumFlockersTo(num)
    {        
        if(num > MAX_FLOCKERSPERFLOCK || num < MIN_FLOCKERSPERFLOCK) return;

        flockersPerFlock = num;

        for(let i = 0; i < flocks.length; i++)
        {
            flocks[i].setNumFlockersTo(flockersPerFlock);
        }
    }

    function setupFlocks()
    {
        setNumFlocksTo(DEFAULT_FLOCKS);
        setFlockColors(DEFAULT_COLOR);
    }

    function setFlockColors(color)
    {
        flockColors = color;
        for(let i = 0; i < flocks.length; i++)
        {
            flocks[i].setColor(color);
        }
    }


    return {
        createFlock,
        updateAllFlocks,
        scatterAllFlocks,
        setNumFlocksTo,
        setAllNumFlockersTo,
        setupFlocks,
        setFlockColors
    }

})();