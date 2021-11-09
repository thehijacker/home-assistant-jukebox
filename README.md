# Fork details

This is a fork of original project made/edited/updated by [lukx](https://github.com/lukx/home-assistant-jukebox). I added couple of new functions like:

* Displaying station logo image and station name on media player
* Added option to display custom sensor text (song author and title)
* Added a power off button, that turns off player
* Fix (workaround) for long playback start for specific radio stations
* Fix for icons not showing up after HA update to version 2021.11.X

** Tested and working great on my _Google Nest_ speakers **

# Jukebox Card for Home-Assistant

This is a media player UI for Home-Assistant leveraging the potential of the excellent new
[Lovelace UI.](https://www.home-assistant.io/lovelace/)

It allows you to configure a set of web radio stations (or possibly other radio media IDs such as spotify), and
play them to media player entities of your choice, like chromecast or spotify connect listeners.

You can send different media to different players, which makes it usable for multi-room setups: Let your kids listen
to some *Frozen*, while you're Jazzing in the Kitchen. Volume-Level is handled separately, too.

## Screenshot
![alt text](https://github.com/thehijacker/home-assistant-jukebox/blob/master/screenshot.png?raw=true "See the jukebox in action")

## Acknowledgement
Apart from the home-assistant project, I need to say thanks to User [Bob_NL](https://community.home-assistant.io/u/Bob_NL)
who made his evergreen [Chromecast Radio](https://community.home-assistant.io/t/chromecast-radio-with-station-and-player-selection/12732)
available to all of us in the Home-Assistant forums. This jukebox is heavily deriving from the great work of all the
people in the thread.

## Usage
### Installation using HACS
I recommend using [HACS](https://hacs.xyz/) to install and update this integration. As the jukebox card is not yet in the official repositories of HACS, follow these steps to get it running:

* (Install HACS if you have not already; look into their documentation in the link above to achieve this)
* In your Home Assistant, open the HACS panel
* Click on "Frontend" to see the list of Frontend (or "Lovelace") integrations
* On the top right of your screen, click on the three dots to see "Custom Repositories"
* in the "Custom Repositories" dialogue, paste `https://github.com/thehijacker/home-assistant-jukebox.git` in the "custom repository URL" box, and select "Lovelace" as the Category.
* Now, in the Frontend Category, search for "Jukebox" and install this module like you would install any other module.


### Configuration
Find stream URLs, e.g. on [Radio-Browser.info](http://www.radio-browser.info/gui/#/)
See this example setting a couple of Web radios to my two chromecast players.

#### Using lovlace in yaml mode

*Excerpt of ui-lovelace.yaml*
```
resources:
  - url: /hacsfiles/home-assistant-jukebox/jukebox-card.js
    type: module
views:
- name: Example
  cards:
  - type: "custom:jukebox-card"
    links:
      - url: http://streams.greenhost.nl:8080/jazz
        name: Concertzender Jazz
        logo: https://raw.githubusercontent.com/home-assistant/assets/master/logo/logo-small.png
        song: sensor.radio_jazz
      - url: http://fs-insidejazz.fast-serv.com:8282/;stream.nsv
        name: Inside Jazz
        logo: https://raw.githubusercontent.com/home-assistant/assets/master/logo/logo-small.png
        song: sensor.radio_inside_jazz
      - url: http://stream.srg-ssr.ch/m/rsj/mp3_128
        name: Radio Swiss Jazz
    entities:
      - media_player.wuerfel_wohnzimmer
      - media_player.wuerfel_kueche
```

#### Using lovelace UI
* Go to the view you want to add the card, switch it to edit mode and click `+ add card`
* Scroll all the way down and select `Manual`
* Paste your config and save

Example config (note the differances from the above example):
```
type: "custom:jukebox-card"
links:
  - url: http://streams.greenhost.nl:8080/jazz
	name: Concertzender Jazz
	logo: https://raw.githubusercontent.com/home-assistant/assets/master/logo/logo-small.png
	song: sensor.radio_jazz
  - url: http://fs-insidejazz.fast-serv.com:8282/;stream.nsv
	name: Inside Jazz
	logo: https://raw.githubusercontent.com/home-assistant/assets/master/logo/logo-small.png
	song: sensor.radio_inside_jazz
  - url: http://stream.srg-ssr.ch/m/rsj/mp3_128
	name: Radio Swiss Jazz
entities:
  - media_player.wuerfel_wohnzimmer
  - media_player.wuerfel_kueche
```
