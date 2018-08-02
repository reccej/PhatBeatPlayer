import BeatWrapper from './BeatWrapper';

export default class ArtistWrapper {
    constructor(artist) {
        this.beats = [];

        for(let prop in artist) {
            if(prop === 'json_agg') {
                for(let beatrow of artist[prop]) {
                    let beat = new BeatWrapper(beatrow);
                    beat.artistName = artist.longname;
                    beat.artistId = artist.id;
                    this.beats.push(beat);
                }
            } else {
                this[prop] = artist[prop];
            }
        }
    }

    setShopify(shopify) {
        this.shopify = shopify;

        for(let beat of this.beats) {
            beat.shopify = shopify;
        }
    }
};

