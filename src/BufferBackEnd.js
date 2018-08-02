import BackEndBase from './BackEndBase.js';
import { ENUMS as PBPENUMS } from './PhatBeatPlayer';

export default class BufferBackEnd extends BackEndBase {
    constructor() {
        super();

        this.initialized = false; /* Make sure the audio plays when tapped by a mobile device */
        this.seeking = false;
        this.paused = false;
        this.stopped = true;
        this.buffer = undefined;
        this.source = undefined;
        this.endedListener = () => { this.triggerEvent('ended'); };

        this.timer = {
            processor: undefined,
            processorBufferLength: 256,
            currentTime: 0,
            lastTime: 0,
            startContextTimestamp: 0,
            startTimerTimestamp: 0,
        }

    }

    /* This function plays a silent buffer.
    Used for mobile devices which need a touch input before audio is allowed to start playing, so this buffer runs on the first touch event */
    initialize() {
        let buffer = this.webAudio.context.createBuffer(1, 1, 22050);
        let source = this.webAudio.context.createBufferSource();
        source.buffer = buffer;
        source.connect(this.webAudio.context.destination);

        source.start(0);
        this.initialized = true;
    }

    setBuffer(buffer) {

    }

    getCurrentTime() { return this.timer.currentTime; }
    getDuration() { return this.buffer.duration; }

    play() {
        if(!this.initialized) this.initialize();

        // console.log("PLaying info:", this);

        if(this.buffer) {
            let source = this.webAudio.context.createBufferSource();
            source.onended = (e) => {
                this.triggerEvent('ended');

            };
            source.buffer = this.buffer;
            this.addSource(source);

            // console.log("Paused:", this.paused);

            if(this.paused || this.seeking) {
                this.timer.currentTime = this.timer.lastTime;

                this.clearSeekingAndPaused();
            }

            // if(this.paused) {
            //
            //     this.paused = false;
            // } else if(this.seeking) {
            //     this.timer.currentTime = this.timer.lastTime;
            //     this.timer.lastTime = 0;
            //     this.seeking = false;
            // }

            this.addTimerProcess();
            source.start(0,this.timer.currentTime);

            this.stopped = false;
            //this.paused = false;

            this.triggerEvent('play', {play: true});
        }

    }

    pause() {
        this.paused = true;
        this.timer.lastTime = this.timer.currentTime;

        this.stopSource();
        // this.webAudio.source.stop();
        this.removeTimerProcess();
    }

    stop(stopSource = true) {
        this.stopSource();


        this.stopped = true;
    }

    stopSource() {
        if(this.webAudio.source != null) {
            this.webAudio.source.onended = null;
            this.webAudio.source.stop();
            this.webAudio.source = undefined;
            this.removeTimerProcess();
            this.timer.currentTime = 0;
        }

        // console.log("Stopped source");
    }

    seek(time, play = true) {
        this.seeking = true;
        this.stopSource();
        this.timer.lastTime = time;
        // this.stop(true);
        // this.timer.currentTime = time;
        if(play) { this.play(); }
    }

    playBeat(beat, time) {
        if (!beat) {

            // if (this.data.type === this.ENUMS.DATATYPE.BEAT && this.data.data) beat = this.data.data;
            // else return false;
        }

        // if(this.)

        // if(!this.stopped) {
        //     this.stop(true);
        // }

        console.log("PLaying BEat at time:", beat, time);
        // console.log("BeatStatus:", beat.getLoadStatus());

        if(beat.getLoadStatus() === PBPENUMS.DATASTATE.READY) {
            this.buffer = beat.getBuffer();
            this.play();
        }
    }

    queueBeat(beat) {
        var handleBeatEvent = (e) => {
            let status = e.detail.status;
            switch(status) {
                case 'loaded':
                    beat.removeEventListener('loadstatus', handleBeatEvent);
                    break;
                case 'fail':
                    alert("Beat failed to load");
                    break;
                default:
                    break;
            }
        };

        beat.addEventListener('loadstatus', handleBeatEvent);
        return beat.loadIntoContextBuffer(this.webAudio.context);
    }

    addTimerProcess() {
        /*
            TODO: Switch to WebAudio Workers when more heavily adopted
            TODO: Analyze this vs interval
        */
        var processor = this.webAudio.context.createScriptProcessor(this.processorBufferLength);
        processor.onaudioprocess = (e) => {
            this.timer.currentTime = parseFloat(this.timer.startTimerTimestamp) + (this.webAudio.context.currentTime-parseFloat(this.timer.startContextTimestamp));
            this.triggerEvent("timeupdate", {time: this.timer.currentTime, duration: this.buffer.duration});
        };
        processor.connect(this.webAudio.context.destination);
        this.timer.processor = processor;
        this.timer.startTimerTimestamp = this.timer.currentTime;
        this.timer.startContextTimestamp = this.webAudio.context.currentTime;

        // console.log("Timer:", this.timer);
    }

    removeTimerProcess() {
        if(typeof this.timer.processor !== 'undefined') {
            this.timer.processor.disconnect();
            this.timer.processor = undefined;
            this.timer.currentTime -= 0.05;
        }
    }

    clearSeekingAndPaused() {
        this.paused = false;
        this.seeking = false;
        this.timer.lastTime = 0;
    }
}