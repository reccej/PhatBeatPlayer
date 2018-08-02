//import PhatBeatPlayer from "../PBP/PhatBeatPlayer";

/**
 * Repurposed some code from a mrdoob. Thanks mrdoob!
 *
 * @author mrdoob / http://mrdoob.com/
 */
export default class EventClass {
    constructor() {
        this.debug = false;
    }

    validateOptions(options, required) {
        for(let option in options) {
            this[option] = options[option];
        }
    }

    triggerEvent(name, data) {
        let event;
        if (window.CustomEvent) {
            event = new CustomEvent(name, {detail: data});
        } else {
            event = document.createEvent('CustomEvent');
            event.initCustomEvent(name, true, true, data);
        }

        if(this.debug) console.log("Event created:", event);

        this.dispatchEvent(event);
    }

    addEventListener(type, listener) {
        if (this._listeners === undefined) this._listeners = {};
        var listeners = this._listeners;
        if (listeners[type] === undefined) {
            listeners[type] = [];
        }
        if (listeners[type].indexOf(listener) === - 1) {
            listeners[type].push(listener);
        }
    }

    hasEventListener(type, listener) {
        if (this._listeners === undefined) return false;
        var listeners = this._listeners;
        return listeners[type] !== undefined && listeners[type].indexOf(listener) !== - 1;
    }

    removeEventListener(type, listener) {
        if (this._listeners === undefined) return;
        var listeners = this._listeners;
        var listenerArray = listeners[type];
        if (listenerArray !== undefined) {
            var index = listenerArray.indexOf(listener);
            if ( index !== - 1 ) {
                listenerArray.splice( index, 1 );
            }
        }
    }

    dispatchEvent(event) {
        if (this._listeners === undefined) return;
        var listeners = this._listeners;
        var listenerArray = listeners[event.type];
        if (listenerArray !== undefined) {
            //event.target = this;
            var array = listenerArray.slice( 0 );
            for (var i = 0, l = array.length; i < l; i ++) {
                array[ i ].call(this, event);
            }
        }
    }


}