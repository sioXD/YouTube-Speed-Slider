# YouTube Speed Slider - Add-on

> This is an Updated Version of the [youtube-speed-controls](https://github.com/Kissaki/youtube-speed-controls) Firefox Add-on by [Jan Klass](https://github.com/Kissaki).

Add playback speed indicator and controls to the YouTube video player bottom left.

[![add to Firefox](https://img.shields.io/amo/v/youtube-speed-slider-controls?label=add%20to%20Firefox&style=for-the-badge&logo=firefox)](https://addons.mozilla.org/de/firefox/addon/youtube-speed-slider-controls/)

![screenshot of the playback speed display and controls in the YouTube player](docs/img/screenshot1.png)

![screenshot of the popup menu](docs/img/screenshot2.png)

## Developing

in Firefox:

- go to `about:debugging#/runtime/this-firefox`
- press `Load Temporary Add-on`
- then select the `manifest.json` file in this directory

## Publish

### local

- run `./pack.ps1`
- go to `about:debugging#/runtime/this-firefox`
- select the zip

### on Marketplace

- run `./pack.ps1`
- go to: <https://addons.mozilla.org/en-US/developers/addons>
- Add new Addon / New Version
- select the zip

## TODO

- optimize for shorts
- make the slider only apper when hovering
