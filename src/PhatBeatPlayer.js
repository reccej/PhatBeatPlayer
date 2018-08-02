import EventClass from './EventObject.js';
import BufferBackEnd from './BufferBackEnd.js';

export const ENUMS = {
    BACKEND: {
        BUFFER: 'buffer',
        MEDIAELEMENT: 'mediaelement'
    },

    /* Data load state */
    DATASTATE: {
        NONE: 'none', /* No data has been loaded */
        LOADING: 'loading', /* Data is currently being loaded*/
        ERROR: 'error', /* Error in loading data */
        READY: 'ready' /* Data loaded successfully and is ready to play */
    },


    EVENTS: {
        DATASTATE: 'datastate',
        LOOPSTATE: 'loopstate',
        PLAYSTATE: 'playstate',
        PLAYLIST: 'playlist',
        SEQUENCERUPDATE: 'sequencerupdate',
        SHUFFLESTATE: 'shufflestate',
        TIMEUPDATE: 'timeupdate',
        TRACKUPDATE: 'trackupdate'
    },
    /* Loop status state */
    LOOPSTATE: {
        NONE: 'none', /* Loop is not */
        PLAYLIST: 'playlist',
        TRACK: 'track',
        SECTION: 'section'
    },
    /* Status of the Player. */
    PLAYSTATE: {
        STOP: 'stop', /* Player is stopped */
        PAUSE: 'pause', /* Player is paused */
        PLAY: 'play', /* Player is playing */
        QUEUE: 'queue', /* Player is loading data and will play when data is loaded */
    },


    SHUFFLESTATE: {
        NONE: 'none',
        SHUFFLE: 'shuffle'
    },


};

const DEFUAULT_QUEUE_LENGTH = 3;

export default class PhatBeatPlayer extends EventClass {
    constructor(options) {
        super();
        if(options == null) {
            options = {};
        }

        this.backend = undefined;
        this.backendType = ENUMS.BACKEND.BUFFER;
        this.playState = ENUMS.PLAYSTATE.STOP;
        this.dataState = ENUMS.DATASTATE.NONE;
        this.loopState = ENUMS.LOOPSTATE.NONE;
        this.shuffleState = ENUMS.SHUFFLESTATE.NONE;
        this.shufflePlaylist = [];
        this.shufflePlaylistIndex = -1;

        this.enabled = false;
        this.queueLength = (options.queueLength != null ? options.queueLength : DEFUAULT_QUEUE_LENGTH);
        this.currentBeat = undefined;
        this.currentBeatIndex = -1;
        this.currentPlaylist = [];
        this.currentBPMSection = undefined;
        this.currentTrackSection = undefined;
        this.sequencer = {
            info: {
                
            }
        };

        this.useSequencerEvents = true;
        // this.useGettersAndSetters

        /* Parse options */
        this.validateOptions(options);

        switch(this.backendType) {
            case ENUMS.BACKEND.BUFFER:
            default:
                this.backend = new BufferBackEnd();
                this.backend.addEventListener('ended', (e) => {
                    // console.log("Buffer Ended:", e);
                    if(this.currentBeatIndex < this.currentPlaylist.length-1) {
                        this.nextTrack();
                    } else {
                        this.stop();
                        this.__unloadCurrentBeat();
                    }
                    // this.triggerEvent('ended', {beat: this.beat.data});
                });
                this.backend.addEventListener('timeupdate', (e) => {


                    if(e.detail.time > e.detail.duration) {

                    }

                    if(this.currentBeat.useBPM()) {
                        this.__updateSequencer(e.detail.time);
                    }

                    this.triggerEvent('timeupdate', {time: e.detail.time, duration: e.detail.duration });
                });

                break;
            case ENUMS.BACKEND.MEDIAELEMENT:

                break;
        }
    }

    /* Class Getters */
    getSpectrumAnalyzer() { return this.backend.getAnalyser(); }
    getAudioContext() { return this.backend.getAudioContext(); }
    getWebAudioObjects() { return this.webAudio; }
    getCurrentPlaylist() { return this.currentPlaylist; }
    getCurrentBeat() { return this.currentBeat; }
    getCurrentTime() { return this.backend.getCurrentTime(); }
    getDuration() { return this.backend.getDuration(); }
    getSequencerInfo() { return this.sequencer.info; }
    // getBPMInfo() { return this.beat.bpmInfo; }

    isPlaying() { return this.playState === ENUMS.PLAYSTATE.PLAY; }
    isLoaded() { return this.dataState === ENUMS.DATASTATE.READY; }
    isLoading() { return this.dataState === ENUMS.DATASTATE.LOADING; }
    isPlayingFirstBeat() {
        if (this.shuffleState === ENUMS.SHUFFLESTATE.NONE) {
            return this.currentBeat != null
                && this.currentBeatIndex === 0
                && this.loopState === ENUMS.LOOPSTATE.NONE;
        } else {
            return this.currentBeat != null
                && this.shufflePlaylistIndex === 0
                && (this.loopState === ENUMS.LOOPSTATE.NONE
                    || this.loopState === ENUMS.LOOPSTATE.PLAYLIST
                    && (this.currentPlaylist.length === 1
                        || this.shufflePlaylist.length < this.currentPlaylist.length));
        }
    }

    isPlayingLastBeat() {
        if(this.shuffleState === ENUMS.SHUFFLESTATE.NONE) {
            return this.currentBeat != null
                && this.currentBeatIndex === this.currentPlaylist.length-1
                && this.loopState === ENUMS.LOOPSTATE.NONE;
        } else {
            return this.currentBeat != null
                && this.shufflePlaylistIndex === this.shufflePlaylist.length-1
                && this.shufflePlaylist.length === this.currentPlaylist.length
                && this.loopState === ENUMS.LOOPSTATE.NONE;
        }

    }
    // isEnabled() {
        //console.log("Checking if enabled");
        // return this && this.currentBeat != null && this.currentBeat.getLoadStatus() !== ENUMS.DATASTATE.NONE && this.currentBeat.getLoadStatus() !== ENUMS.DATASTATE.ERROR }

    addAudioEffect(effect) {
        this.backend.pushAudioEffect(effect);
    }

    play(playstate = undefined, time) {
        if(!this.enabled || this.isLoading()) {
            return false;
        }

        /* Set Playstate */
        /* If playstate is passed into function, set playstate equal to that value */
        if(playstate) {
            this.playState = playstate;
        } else {
            /* Otherwise, set playstate as a switch between pause and play. If already queued up to play, return and wait for the queue to resolve */
            switch(this.playState) {
                case ENUMS.PLAYSTATE.PLAY:
                    this.playState = ENUMS.PLAYSTATE.PAUSE;
                    break;
                case ENUMS.PLAYSTATE.PAUSE:
                case ENUMS.PLAYSTATE.STOP:
                    this.playState = ENUMS.PLAYSTATE.PLAY;
                    break;
                default:
                    break;
            }
        }

        if(!this.backend.initialized) {
            this.backend.initialize();
        }

        console.log("Playing:", this.currentBeat, this.playState, time);

        switch(this.playState) {
            case ENUMS.PLAYSTATE.PLAY:
                this.backend.playBeat(this.currentBeat, time);
                break;
            case ENUMS.PLAYSTATE.PAUSE:
                this.backend.pause();
                break;
            case ENUMS.PLAYSTATE.STOP:
                this.backend.stop();
                break;
            default:
                break;
        }

        this.setState(ENUMS.EVENTS.PLAYSTATE, this.playState);
    }

    stop() {
        this.playState = ENUMS.PLAYSTATE.STOP;
        this.backend.stop();
    }

    changeVolume(volume) {
        this.backend.setVolume(volume/100.0,0);
        this.triggerEvent('volume', {volume: volume});
    }

    muteAudio() {
            this.buffer.muted = !this.buffer.muted;

            if(this.buffer.muted) {
                this.buffer.lastMutedVal = this.buffer.gain.gain.value;
                this.buffer.gain.setValueAtTime(0,0);
            } else {
                this.buffer.gain.gain.setValueAtTime(this.buffer.lastMutedVal,0);
            }
    }

    __getRandomTrack() {
        return Math.round(Math.random()*this.currentPlaylist.length);
    }

    __unloadCurrentBeat() {
        this.currentBeat = undefined;
        this.sequencer.info = {};
    }

    loadPlaylist(playlist, play = false, index = 0) {
        if(playlist != null && playlist.length > 0) {
            this.currentBeat = undefined;
            this.currentPlaylist = playlist;

            if(play) {
                this.loadAndPlayBeat(this.currentPlaylist[index]);
            }
        }
    }

    addBeatToPlaylist(beat, index = -1) {
        if(beat != null) {
            let retval;
            if(index < 0 || index >= this.currentPlaylist.length) { retval = this.currentPlaylist.push(beat); }
            else {
                this.currentPlaylist.splice(index, 0, beat);
                retval = this.currentPlaylist.length;
            }

            this.setState(ENUMS.EVENTS.PLAYLIST, this.currentPlaylist);
            // console.log("Retval:", retval);
            return retval;
        } else {
            return -1;
        }
    }

    addBeatToPlaylistAndPlay(beat, time = -1) {
        let index = this.addBeatToPlaylist(beat);
        if(index !== -1) {
            this.loadAndPlayBeat(index-1, time);
        } else {
            return false;
        }
    }

    removeBeatFromPlaylist(index) {
        if(index > -1 && index < this.currentPlaylist.length) {
            this.currentPlaylist.splice(index, 1);
            this.setState(ENUMS.EVENTS.PLAYLIST, this.currentPlaylist);
            return true;
        } else {
            return false;
        }
    }

    playCurrentBeat(time) {
        let play = () => {
            this.play(ENUMS.PLAYSTATE.PLAY, time);
        };

        if(this.currentBeat.isLoaded()) { play(); }
        else {
            this.loadBeatData(this.currentBeat).then(() => {
                this.setState(ENUMS.EVENTS.DATASTATE, this.currentBeat.getLoadStatus());
                play();
            });
        }
    }

    loadBeatData(beat) {
        if(beat != null) {
            if(!beat.isLoaded()) { this.setState(ENUMS.EVENTS.DATASTATE, ENUMS.DATASTATE.LOADING); }
            // this.setState(ENUMS.EVENTS.DATASTATE, beat.getLoadStatus());
            return beat.load(this.backend.webAudio.context);
        }
    }

    loadBeat(index) {
        if(index > -1 && index < this.currentPlaylist.length) {
            if(this.isPlaying()) {
                this.backend.stopSource();
            }

            this.backend.clearSeekingAndPaused();
            this.__unloadCurrentBeat();

            this.currentBeatIndex = index;
            this.currentBeat = this.currentPlaylist[this.currentBeatIndex];
            this.setState(ENUMS.EVENTS.DATASTATE, this.currentBeat.getLoadStatus());
            return true;
        } else {
            return false;
        }
    }

    loadAndPlayBeat(index, time = -1) {
        if(this.loadBeat(index)) {
            this.playCurrentBeat(time);
        } else {
            return false;
        }
    }

    __updateSequencer(time) {
        // console.log("UpdatingSequencer:", time);

        let bpmInfo = this.currentBeat.getBPMSection(time);

        let sequencerInfo = {
            beat: -1,
            bar: -1,
            timeRatio: -1,
        };

        let ratio = (time-bpmInfo.start)/parseFloat(bpmInfo.spb);
        sequencerInfo.timeRatio = ratio%1;
        let floor = ratio-sequencerInfo.timeRatio;
        sequencerInfo.bar = Math.floor(floor/4);
        sequencerInfo.beat = Math.floor(floor%4);

        this.setState(ENUMS.EVENTS.SEQUENCERUPDATE, sequencerInfo);
        this.sequencer.info = sequencerInfo;
    }

    seek(time) {
        console.log("Seeked to:", time);

        this.seeking = true;
        if(this.playState === ENUMS.PLAYSTATE.PLAY) { this.backend.seek(time, true); }
        else if (this.playState === ENUMS.PLAYSTATE.PAUSE) {
            this.triggerEvent('timeupdate', {time: time, duration: this.currentBeat.duration });
            this.backend.seek(time, false);
        }
    }

    setState(type, value) {
        // console.log("PBP Change State:", type, value);

        switch(type) {
            case ENUMS.EVENTS.DATASTATE:
                this.dataState = value;
                if(value === ENUMS.DATASTATE.READY) { this.enabled = true; }
                break;
            case ENUMS.EVENTS.LOOPSTATE:
                this.loopState = value;
                break;
            case ENUMS.EVENTS.PLAYSTATE:
                this.playState = value;
                break;
            case ENUMS.EVENTS.SHUFFLESTATE:
                this.shuffleState = value;
                break;
            case ENUMS.EVENTS.SEQUENCERUPDATE:
            case ENUMS.EVENTS.TRACKUPDATE:
            case ENUMS.EVENTS.TIMEUPDATE:
            case ENUMS.EVENTS.PLAYLIST:
            default:
                break;
        }

        this.triggerEvent(type, value);
    }

    clearPlaylist() {
        this.currentPlaylist = [];
        this.setState(ENUMS.EVENTS.PLAYLIST, this.currentPlaylist);
    }

    setShuffleState(shuffle) {
        this.shufflePlaylist.length = 0;

        // this.shufflePlayedIndexes.length = 0;
        // this.shufflePlayedCurrentIndex = -1;
        // this.shuffleLastPlayed.length = 0;
        // this.shuffleLastPlayedIndex = -1;

        switch(shuffle) {
            case ENUMS.SHUFFLESTATE.NONE:
            default:
                break;
            case ENUMS.SHUFFLESTATE.SHUFFLE:
                if(this.currentBeatIndex > -1 && this.currentBeatIndex < this.currentPlaylist.length) {
                    this.shufflePlaylist.push(this.currentBeatIndex);
                    this.shufflePlaylistIndex = 0;

                    // this.shufflePlayedIndexes.push(this.currentBeatIndex);
                    // this.shufflePlayedCurrentIndex = 0;
                }

                break;
        }

        this.setState(ENUMS.EVENTS.SHUFFLESTATE, shuffle);
    }
    toggleShuffle() {
        switch(this.shuffleState) {
            case ENUMS.SHUFFLESTATE.NONE:
                return this.setShuffleState(ENUMS.SHUFFLESTATE.SHUFFLE);
            case ENUMS.SHUFFLESTATE.SHUFFLE:
            default:
                return this.setShuffleState(ENUMS.SHUFFLESTATE.NONE);
        }
    }

    setLoopState(loop) {
        if(loop === ENUMS.LOOPSTATE.NONE || loop === ENUMS.LOOPSTATE.PLAYLIST) { this.setShuffleState(this.shuffleState); }

        this.setState(ENUMS.EVENTS.LOOPSTATE, loop);
    }
    toggleLoop() {
        switch(this.loopState) {
            case ENUMS.LOOPSTATE.NONE:
                this.setLoopState(ENUMS.LOOPSTATE.PLAYLIST);
                break;
            case ENUMS.LOOPSTATE.PLAYLIST:
                this.setLoopState(ENUMS.LOOPSTATE.TRACK);
                break;
            case ENUMS.LOOPSTATE.TRACK:
                if(this.currentBeat.useTrackSections()) { this.setLoopState(ENUMS.LOOPSTATE.SECTION); }
                else { this.setLoopState(ENUMS.LOOPSTATE.NONE); }
                break;
            case ENUMS.LOOPSTATE.SECTION:
            default:
                this.setLoopState(ENUMS.LOOPSTATE.NONE);
                break;

        }
    }

    nextTrack(play = true) {
        let newIndex;

        switch(this.shuffleState) {
            case ENUMS.SHUFFLESTATE.NONE:
            default:
                switch(this.loopState) {
                    case ENUMS.LOOPSTATE.NONE:
                    default:
                        newIndex = this.currentBeatIndex+1;
                        if(newIndex >= this.currentPlaylist.length) { return false; }
                        break;
                    case ENUMS.LOOPSTATE.PLAYLIST:
                        newIndex = this.currentBeatIndex+1;
                        if(newIndex >= this.currentPlaylist.length) { newIndex = 0; }
                        break;
                    case ENUMS.LOOPSTATE.TRACK:
                        newIndex = this.currentBeatIndex;
                        break;
                    case ENUMS.LOOPSTATE.SECTION:
                        console.log("!!!Loop Section!!!!");
                        break;
                }
                break;
            case ENUMS.SHUFFLESTATE.SHUFFLE:
                switch(this.loopState) {
                    case ENUMS.LOOPSTATE.NONE:
                    default:
                        if(this.shufflePlaylist.length === this.currentPlaylist.length) {
                            return false;
                        }

                        if(this.shufflePlaylistIndex < this.shufflePlaylist.length-1) {
                            this.shufflePlaylistIndex++;
                        } else {
                            /*
                            Find track that hasn't been played before at random.
                            */
                            while(newIndex = this.__getRandomTrack()) {
                                if(!this.shufflePlaylist.includes(newIndex)) { break; }
                            }

                            this.shufflePlaylist.push(newIndex);
                            this.shufflePlaylistIndex = this.shufflePlaylist.length-1;
                        }

                        newIndex = this.shufflePlaylist[this.shufflePlaylistIndex];
                        break;
                    case ENUMS.LOOPSTATE.PLAYLIST:
                        if(this.shufflePlaylistIndex < this.shufflePlaylist.length-1) {
                            this.shufflePlaylistIndex++;
                        } else if(this.shufflePlaylist.length === this.currentPlaylist.length) {
                            this.shufflePlaylistIndex = 0;
                        } else {
                            // /*
                            // Find track that hasn't been played before at random.
                            // */
                            // while(newIndex = this.__getRandomTrack()) {
                            //     if(!this.shufflePlaylist.includes(newIndex)) { break; }
                            // }

                            newIndex = this.__getRandomTrack();
                            let shuffleIndex = this.shufflePlaylist.indexOf(newIndex);

                            if(shuffleIndex === -1) {
                                this.shufflePlaylist.push(newIndex);
                                this.shufflePlaylistIndex = this.shufflePlaylist.length-1;
                            } else {
                                this.shufflePlaylistIndex = shuffleIndex;
                            }

                            newIndex = this.shufflePlaylist[this.shufflePlaylistIndex];
                        }
                        break;
                    case ENUMS.LOOPSTATE.TRACK:
                        newIndex = this.currentBeatIndex;
                        break;
                    case ENUMS.LOOPSTATE.SECTION:
                        console.log("!!!Loop Section!!!!");
                        newIndex = this.currentBeatIndex;
                        break;
                }
                break;
        }

        console.log("ShuffleInfo:", this.shufflePlaylist, this.shufflePlaylistIndex);

        if(play) { this.loadAndPlayBeat(newIndex); }
        else { this.loadBeat(newIndex); }
    }

    previousTrack(play = true) {
        let newIndex;

        switch(this.shuffleState) {
            case ENUMS.SHUFFLESTATE.NONE:
            default:
                switch(this.loopState) {
                    case ENUMS.LOOPSTATE.NONE:
                    default:
                        newIndex = this.currentBeatIndex-1;
                        if(newIndex < 0) { return false; }
                        break;
                    case ENUMS.LOOPSTATE.PLAYLIST:
                        newIndex = this.currentBeatIndex-1;
                        if(newIndex < 0) { newIndex = this.currentPlaylist.length-1; }
                        break;
                    case ENUMS.LOOPSTATE.TRACK:
                        newIndex = this.currentBeatIndex;

                        break;
                    case ENUMS.LOOPSTATE.SECTION:
                        console.log("!!!Loop Section!!!!");
                        break;
                }

                // if(play) { this.loadAndPlayBeat(newIndex); }
                // else { this.loadBeat(newIndex); }
                break;
            case ENUMS.SHUFFLESTATE.SHUFFLE:
                switch(this.loopState) {
                    case ENUMS.LOOPSTATE.NONE:
                    default:
                        if(this.shufflePlaylistIndex === 0) {
                            return false;
                        } else {
                            this.shufflePlaylistIndex--;
                        }

                        newIndex = this.shufflePlaylist[this.shufflePlaylistIndex];
                        break;
                    case ENUMS.LOOPSTATE.PLAYLIST:
                        if(this.shufflePlaylistIndex === 0) {
                            this.shufflePlaylistIndex = this.shufflePlaylist.length-1;
                        } else {
                            this.shufflePlaylistIndex--;
                        }

                        newIndex = this.shufflePlaylist[this.shufflePlaylistIndex];
                        break;
                    case ENUMS.LOOPSTATE.TRACK:
                        newIndex = this.shufflePlaylist[this.shufflePlaylistIndex];
                        break;
                    case ENUMS.LOOPSTATE.SECTION:
                        console.log("!!!Loop Section!!!!");
                        newIndex = this.shufflePlaylist[this.shufflePlaylistIndex];
                        break;
                }
                break;
        }

        console.log("ShuffleInfo:", this.shufflePlaylist, this.shufflePlaylistIndex);

        if(play) { this.loadAndPlayBeat(newIndex); }
        else { this.loadBeat(newIndex); }
    }

    findBeatInPlaylist(beat) {
        return this.currentPlaylist.indexOf(beat);
    }

    __updateCurrentTracks() {

    }
}