import React from 'react';
import EventClass from './EventObject';
import CartButtonSmall from '../AddToCartButton';
import CartButton from '../../shop/item/AddToCartButton';
import {ENUMS as PBPENUMS} from './PhatBeatPlayer';
// import {SHOP_CATEGORY_SUBTYPES} from "../../data/ShopCategoriesWrapper";
import {SHOP_CATEGORY_SUBTYPES} from "../../shop/filters/FilterEnums";

// const ENUMS = {
//     BUFFER_STATUS: {
//         INIT: 'init',
//         FAIL: 'fail',
//         LOADING: 'loading',
//         LOADED: 'loaded',
//         RETRY: 'retry'
//     },
// };

const TIME_SIGNATURE_BEATS = 4;
const TIME_SIGNATURE_BAR = 4;

export default class Beat extends EventClass {
    constructor(beat) {
        super();

        for(let prop in beat) {
            this[prop] = beat[prop];
        }

        this.sequencerInfo = {
            bpm: {
                sections: [],
                currentSection: undefined,
                beatsPerBar: TIME_SIGNATURE_BEATS
            },
            track: {
                sections: [],
                currentSection: undefined
            }
        };

        //console.log("Beat Sections:", beat.bpm_sections);
        if(beat.bpm_sections != null && beat.bpm_sections !== '') {
            let sections = JSON.parse(beat.bpm_sections);
            for(let section of sections) {
                section.spb = (1/parseFloat(section.bpm/60));
                section.beatsPerBar = TIME_SIGNATURE_BEATS;
                // section.
                this.sequencerInfo.bpm.sections.push(section);
            }

            // this.sequencerInfo.bpm.sections = JSON.parse(beat.bpm_sections);
            for(let section of this.sequencerInfo.bpm.sections) {
                if(parseInt(section.start) === 0) {
                    this.sequencerInfo.bpm.currentSection = section;
                }
            }
        } else if(beat.bpm != null && beat.bpm !== '') {
            let section = {
                start: 0,
                end: 100000,
                bpm: beat.bpm,
                spb: (1/parseFloat(beat.bpm/60)),
                beatsPerBar: TIME_SIGNATURE_BEATS
            };
            this.sequencerInfo.bpm.sections.push(section);
            this.sequencerInfo.bpm.currentSection = section;
        }

        if(beat.track_sections != null && beat.track_section !== '') {
            this.sequencerInfo.track.sections = JSON.parse(beat.track_sections);
        } else {
            let section = {
                start: 0,
                end: 100000,
                name: "Whole Track"
            };
            this.sequencerInfo.track.sections.push(section);
        }

        this.useBuffer = true;
        this.buffer = {
            data: undefined,
            status: PBPENUMS.DATASTATE.NONE
        };
    };

    load(context) {
        let promiseFunction;

        switch(this.buffer.status) {
            case PBPENUMS.DATASTATE.NONE:
            case PBPENUMS.DATASTATE.ERROR:
                this.setLoadStatus(PBPENUMS.DATASTATE.LOADING);

                let request = new XMLHttpRequest();
                request.open('GET', this.url, true);
                request.responseType = 'arraybuffer';

                promiseFunction = (resolve, reject) => {
                    request.onload = () => {
                        let audioData = request.response;
                        context.decodeAudioData(audioData, (buffer) => {
                            this.buffer.data = buffer;
                            if(!this.duration) this.duration = buffer.duration;

                            this.setLoadStatus(PBPENUMS.DATASTATE.READY);
                            resolve();
                        }, (e) => {
                            this.setLoadStatus(PBPENUMS.DATASTATE.ERROR);
                            reject(e);
                        });
                    };

                    request.send();
                };
                break;
            case PBPENUMS.DATASTATE.LOADING:
            case PBPENUMS.DATASTATE.READY:
            default:
                promiseFunction = (resolve, reject) => { resolve(); }
                break;
        }

        return new Promise(promiseFunction);
    }

    useBPM() { return (this.bpm || this.sequencerInfo.bpm.sections.length > 0); }
    getBPMSection(time) {
        // console.log("SequencerIngoL", this.sequencerInfo);

        if(this.useBPM()) {
            if(time < this.sequencerInfo.bpm.currentSection.start || time > this.sequencerInfo.bpm.currentSection.end) {
                for(let section of this.sequencerInfo.bpm.sections) {
                    if(time >= section.start && time <= section.end) {
                        this.sequencerInfo.bpm.currentSection = section;
                    }
                }
            }

            let section = this.sequencerInfo.bpm.currentSection;

            return this.sequencerInfo.bpm.currentSection;
        }
    }

    useTrackSections() { return this.sequencerInfo.track.sections.length > 1; }
    getTrackSection(time) {
        if(time < this.sequencerInfo.track.currentSection.start || time > this.sequencerInfo.track.currentSection.end) {
            for(let section of this.sequencerInfo.track.sections) {
                if(time >= section.start && time <= section.end) {
                    this.sequencerInfo.track.currentSection = section;
                }
            }
        }

        return this.sequencerInfo.track.currentSection;
    }

    getBuffer() { return this.buffer.data; }
    setLoadStatus(status) {
        this.buffer.status = status;
        this.triggerEvent('loadstatus', {status: status});
    }
    getLoadStatus() { if(this.useBuffer) return this.buffer.status; }
    isLoaded() { return (this.buffer.status === PBPENUMS.DATASTATE.READY); }
    getShopCategory(subtype) {
        switch(subtype) {
            case SHOP_CATEGORY_SUBTYPES.ARTIST:
                return this.shopcategory_artist;
            case SHOP_CATEGORY_SUBTYPES.MOOD:
                return this.shopcategory_mood;
            case SHOP_CATEGORY_SUBTYPES.MERCH:
                break;
        }
    }

    getMoodCategory() {
        return this.shopcategory_mood;
    }
    getArtistCategory() {
        return this.shopcategory_artist;
    }


    // createAddToCartButtonSmall() {
    //     return <CartButtonSmall shopify={this.shopify} beat={this}/>
    // }
    //
    // createAddToCartButton() {
    //     return <CartButton shopify={this.shopify} beat={this}/>
    // }
}