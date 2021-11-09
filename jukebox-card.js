console.info(`%c  HOME-ASSISTANT-JUKEBOX  %c  v2021_11_09_v2`, 'color: orange; font-weight: bold; background: black', 'color: white; font-weight: bold; background: dimgray');
class JukeboxCard extends HTMLElement {
    set hass(hass) {
        if (!this.content) {
            this._hassObservers = [];
            this.appendChild(getStyle());
            const card = document.createElement('ha-card');
            this.content = document.createElement('div');
            card.appendChild(this.content);
            this.appendChild(card);

            this.content.appendChild(this.buildSpeakerSwitches(hass));
            this.content.appendChild(this.buildVolumeSlider());
            this.content.appendChild(this.buildSongDisplay());
            this.content.appendChild(this.buildStationList());
        }

        this._hass = hass;
        this._hassObservers.forEach(listener => listener(hass));
    }

    get hass() {
        return this._hass;
    }

    buildSpeakerSwitches(hass) {
        this._tabs = document.createElement('paper-tabs');
        this._tabs.setAttribute('scrollable', true);
        this._tabs.addEventListener('iron-activate', (e) => this.onSpeakerSelect(e.detail.item.entityId));

        this.config.entities.forEach(entityId => {
            if (!hass.states[entityId]) {
                console.log('Jukebox: No State for entity', entityId);
                return;
            }
            this._tabs.appendChild(this.buildSpeakerSwitch(entityId, hass));
        });

        // automatically activate the first speaker that's playing
        const firstPlayingSpeakerIndex = this.findFirstPlayingIndex(hass);
        this._selectedSpeaker = this.config.entities[firstPlayingSpeakerIndex];
        this._tabs.setAttribute('selected', firstPlayingSpeakerIndex);

        return this._tabs;
    }

    buildStationList() {
        this._stationButtons = [];

        const stationList = document.createElement('div');
        stationList.classList.add('station-list');

        this.config.links.forEach(linkCfg => {
            const stationButton = this.buildStationSwitch(linkCfg.name, linkCfg.url, linkCfg.logo, linkCfg.song)
            this._stationButtons.push(stationButton);
            stationList.appendChild(stationButton);
        });

        // make sure the update method is notified of a change
        this._hassObservers.push(this.updateStationSwitchStates.bind(this));

        return stationList;
    }

    buildSongDisplay() {
        this._song = document.createElement('div');
        this._song.className = 'song-content';
        this._hassObservers.push(this.updateSongState.bind(this));
        return this._song;
    }

    buildVolumeSlider() {
        const volumeContainer = document.createElement('div');
        volumeContainer.className = 'volume center horizontal layout';

        const muteButton = document.createElement('ha-icon-button');
        muteButton.icon = 'hass:volume-high';
        muteButton.isMute = false;
        muteButton.addEventListener('click', this.onMuteUnmute.bind(this));
        const muteButtonIcon = document.createElement('ha-icon');
        muteButtonIcon.icon = 'hass:volume-high';
        muteButton.appendChild(muteButtonIcon);

        const slider = document.createElement('ha-slider');
        slider.min = 0;
        slider.max = 100;
        slider.addEventListener('change', this.onChangeVolumeSlider.bind(this));
        slider.className = 'flex';

        const stopButton = document.createElement('ha-icon-button')
        stopButton.icon = 'hass:stop';
        stopButton.setAttribute('disabled', true);
        stopButton.addEventListener('click', this.onStop.bind(this));
        const stopButtonIcon = document.createElement('ha-icon')
        stopButtonIcon.icon = 'hass:stop';
        stopButton.appendChild(stopButtonIcon);

        const powerButton = document.createElement('ha-icon-button')
        powerButton.icon = 'hass:power';
        powerButton.setAttribute('disabled', true);
        powerButton.addEventListener('click', this.onPower.bind(this));
        const powerButtonIcon = document.createElement('ha-icon')
        powerButtonIcon.icon = 'hass:power';
        powerButton.appendChild(powerButtonIcon);

        this._hassObservers.push(hass => {
            if (!this._selectedSpeaker || !hass.states[this._selectedSpeaker]) {
                return;
            }
            const speakerState = hass.states[this._selectedSpeaker].attributes;

            // no speaker level? then hide mute button and volume
            if (!speakerState.hasOwnProperty('volume_level')) {
                slider.setAttribute('hidden', true);
                stopButton.setAttribute('hidden', true);
                powerButton.setAttribute('hidden', true);
                this._song.setAttribute('hidden', true);
            } else {
                slider.removeAttribute('hidden');
                stopButton.removeAttribute('hidden');
                powerButton.removeAttribute('hidden');
                this._song.removeAttribute('hidden');
            }

            if (!speakerState.hasOwnProperty('is_volume_muted')) {
                muteButton.setAttribute('hidden', true);
            } else {
                muteButton.removeAttribute('hidden');
            }

            if (hass.states[this._selectedSpeaker].state === 'playing') {
                stopButton.removeAttribute('disabled');
                powerButton.removeAttribute('disabled');
            } else {
                stopButton.setAttribute('disabled', true);
            }

            slider.value = speakerState.volume_level ? speakerState.volume_level * 100 : 0;

            if (speakerState.is_volume_muted && !slider.disabled) {
                slider.disabled = true;
                muteButton.icon = 'hass:volume-off';
                muteButton.isMute = true;
            } else if (!speakerState.is_volume_muted && slider.disabled) {
                slider.disabled = false;
                muteButton.icon = 'hass:volume-high';
                muteButton.isMute = false;
            }
        });

        volumeContainer.appendChild(muteButton);
        volumeContainer.appendChild(slider);
        volumeContainer.appendChild(stopButton);
        volumeContainer.appendChild(powerButton);
        return volumeContainer;
    }

    onSpeakerSelect(entityId) {
        this._selectedSpeaker = entityId;
        this._hassObservers.forEach(listener => listener(this.hass));
    }

    onChangeVolumeSlider(e) {
        const volPercentage = parseFloat(e.currentTarget.value);
        const vol = (volPercentage > 0 ? volPercentage / 100 : 0);
        this.setVolume(vol);
    }

    onMuteUnmute(e) {
        this.hass.callService('media_player', 'volume_mute', {
            entity_id: this._selectedSpeaker,
            is_volume_muted: !e.currentTarget.isMute
        });
    }

    onStop(e) {
        this.hass.callService('media_player', 'media_stop', {
            entity_id: this._selectedSpeaker
        });

        delete this._songEntity;
        this._song.innerHTML = '';
    }

    onPower(e) {
        this.hass.callService('media_player', 'turn_off', {
            entity_id: this._selectedSpeaker
        });

        delete this._songEntity;
        this._song.innerHTML = '';
    }

    updateStationSwitchStates(hass) {
        let playingUrl = null;
        const selectedSpeaker = this._selectedSpeaker;

        if (hass.states[selectedSpeaker] && hass.states[selectedSpeaker].state === 'playing'){
            playingUrl = hass.states[selectedSpeaker].attributes.media_content_id;
        }

        this._stationButtons.forEach(stationSwitch => 
        {
            if (stationSwitch.hasAttribute('raised') && stationSwitch.stationUrl !== playingUrl) 
            {
                stationSwitch.removeAttribute('raised');
                return;
            }
            if (!stationSwitch.hasAttribute('raised') && stationSwitch.stationUrl === playingUrl)
            {
                stationSwitch.setAttribute('raised', true);

                // Show song entity state for selected station if available
                if (stationSwitch.stationSong)
                   this._songEntity = stationSwitch.stationSong;
            }
        })
    }

    updateSongState(hass)
    {
        if (this._songEntity)
        {
            if (this._song.innerHTML != hass.states[this._songEntity].state)
            {
                this._song.innerHTML = hass.states[this._songEntity].state;
            }
        } else
        {
             this._song.innerHTML = '';
        }
    }

    buildStationSwitch(name, url, logo, song) {
        const btn = document.createElement('mwc-button');
        btn.stationUrl = url;
        btn.stationName = name;
        btn.stationLogo = logo;
        btn.stationSong = song;
        btn.className = 'juke-toggle';
        btn.innerText = name;
        btn.addEventListener('click', this.onStationSelect.bind(this));
        return btn;
    }

    onStationSelect(e) {		
        delete this._songEntity;
        this._song.innerHTML = '';

        this.hass.callService('media_player', 'play_media', {
            entity_id: this._selectedSpeaker,
            media_content_id: e.currentTarget.stationUrl,
            media_content_type: 'music',
            extra: {
                metadata: {
                stream_type: "LIVE",
                metadataType: 3,
                title: e.currentTarget.stationName,
                artist: "Live Radio",
                images: [
                    { url: e.currentTarget.stationLogo }
                    ]
                }
            }
        });
		
        // Force play for 10 seconds every half a second
        var that = this;
        var i = 0;
        for (i = 500; i <= 5000; i=i+500)
        {
            setTimeout(function() {
                that.hass.callService('media_player', 'media_play', {
                    entity_id: that._selectedSpeaker
                }); }, i);
        }

    }

    setVolume(value) {
        this.hass.callService('media_player', 'volume_set', {
            entity_id: this._selectedSpeaker,
            volume_level: value
        });
    }

    /***
     * returns the numeric index of the first entity in a "Playing" state, or 0 (first index).
     *
     * @param hass
     * @returns {number}
     * @private
     */
    findFirstPlayingIndex(hass) {
        return Math.max(0, this.config.entities.findIndex(entityId => {
            return hass.states[entityId] && hass.states[entityId].state === 'playing';
        }));
    }

    buildSpeakerSwitch(entityId, hass) {
        const entity = hass.states[entityId];

        const btn = document.createElement('paper-tab');
        btn.entityId = entityId;        
        btn.innerText = hass.states[entityId].attributes.friendly_name;
        return btn;
    }

    setConfig(config) {
        if (!config.entities) {
            throw new Error('You need to define your media player entities');
        }
        this.config = config;
    }

    getCardSize() {
        return 3;
    }
}

function pauseBrowser(millis) 
{
    var date = Date.now();
    var curDate = null;
    do {
        curDate = Date.now();
    } while (curDate-date < millis);
}

function getStyle() {
    const frag = document.createDocumentFragment();

    const included = document.createElement('style');
    included.setAttribute('include', 'iron-flex iron-flex-alignment');

    const ownStyle = document.createElement('style');
    ownStyle.innerHTML = `
    .layout.horizontal, .layout.vertical {
        display: -ms-flexbox;
        display: -webkit-flex;
        display: flex;
    }
    
    .layout.horizontal {
        -ms-flex-direction: row;
        -webkit-flex-direction: row;
        flex-direction: row;
    }
    
    .layout.center, .layout.center-center {
        -ms-flex-align: center;
        -webkit-align-items: center;
        align-items: center;
    }
    
    .flex {
        ms-flex: 1 1 0.000000001px;
        -webkit-flex: 1;
        flex: 1;
        -webkit-flex-basis: 0.000000001px;
        flex-basis: 0.000000001px;
    }
    
    [hidden] {
        display: none !important;
    }
    
    .volume {
        padding: 10px 20px;
    }

    .song-content {
        text-align: center;
        color: green;
        font-weight: bold;
    }
    
    mwc-button.juke-toggle {
        --mdc-theme-primary: var(--primary-text-color);
    }
    
    mwc-button.juke-toggle[raised] {
        --mdc-theme-primary: var(--primary-color);
        background-color: var(--primary-color);
        color: var(--text-primary-color);
    }
    
    paper-tabs {
        background-color: var(--primary-color);
        color: var(--text-primary-color);
        --paper-tabs-selection-bar-color: var(--text-primary-color, #FFF);
    }
            
    `;

    frag.appendChild(included);
    frag.appendChild(ownStyle);
    return frag;
}

customElements.define('jukebox-card', JukeboxCard);
