import EventClass from "./EventObject.js";

export default class PhatBeatBackEnd extends EventClass {
    constructor() {
        super();
        this.webAudio = {
            context: undefined,
            source: undefined,
            gain: undefined,
            analyser: undefined,
            effectsChain: [] /* Effects chain: Source --> CHAIN --> Gain --> Analyzer --> Destination */
        };

        /* Check for Web Audio capability. If unable to use Web Audio, blow everything up. */
        if(!this.initializeWebAudio()) {
            return undefined;
        }
    }

    initializeWebAudio() {
        var contextClass = (window.AudioContext ||
            window.webkitAudioContext ||
            window.mozAudioContext ||
            window.oAudioContext ||
            window.msAudioContext);

        if(!contextClass) {
            return false;
        }

        var context = new contextClass();

        var analyser = context.createAnalyser();
        analyser.fftSize = 32;
        analyser.connect(context.destination);

        var gain = context.createGain();
        gain.connect(analyser);

        this.webAudio.gain = gain;
        this.webAudio.context = context;
        this.webAudio.analyser = analyser;
    }

    addSource(source) {
        /* Remove current source if it exists */
        if(this.webAudio.source) this.webAudio.source.disconnect();

        /* Connect source to effects chain */
        if(this.webAudio.effectsChain.length === 0) source.connect(this.webAudio.gain);
        else source.connect(this.webAudio.effectsChain[0]);

        this.webAudio.source = source;
    }

    pushAudioEffect(effect) {
        let length = this.webAudio.effectsChain.length;
        if(length === 0) {
            this.webAudio.gain.disconnect(this.webAudio.analyser);
            this.webAudio.gain.connect(effect);
        } else {
            this.webAudio.effectsChain[length-1].disconnect(this.webAudio.analyser);
            this.webAudio.effectsChain[length-1].connect(effect);
        }

        effect.connect(this.webAudio.analyser);
        this.webAudio.effectsChain.push(effect);
    }

    getAudioContext() {
        return this.webAudio.context;
    }

    getAnalyser() {
        return this.webAudio.analyser;
    }

    setVolume(vol) {
        this.webAudio.gain.gain.setValueAtTime(vol,0);
    }
}