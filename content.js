class NormalPlayerObserver {
  // ytd-watch-flexy > #player-theater-container > #player-container > ytd-player#ytd-player > #container > #movie_player
  //                                                                                                                      > .html5-video-container > video
  //                                                                                                                      > .ytp-chrome-bottom > .ytp-chrome-controls > .ytp-left-controls

  /**
   * @param {(video: HTMLVideoElement, vcLeft: Element)} newPlayerCallback 
   */
  constructor(newPlayerCallback) {
    /**
     * @type {(video: HTMLVideoElement, vcLeft: Element)}
     */
    this._newPlayerCallback = newPlayerCallback

    this._find()
  }
  _find() {
    if (this._tryIdentify()) return

    document.addEventListener("yt-navigate-finish", this._onNavFinish.bind(this))

    // this._observeMutations()
  }
  _tryIdentify() {
    let video = document.querySelector('video')
    if (!video) return false

    let vcLeft = document.querySelector('.ytp-left-controls')
    if (!vcLeft) return false

    this._newPlayerCallback(video, vcLeft)
    return true
  }
  _onNavFinish() {
    this._tryIdentify()
  }
  _observeMutations() {
    this._observer = new MutationObserver(this._onMutation.bind(this))
    this._observer.observe(document, { childList: true, subtree: true })
  }
  _onMutation(mutationList, observer) {
    for (let mutation of mutationList) {
      for (let addedNode of mutation.addedNodes) {
        if (addedNode.nodeName !== 'VIDEO' || addedNode.nodeName !== 'DIV' || addedNode.className !== 'ytp-left-controls') continue

        if (this._tryIdentify()) {
            observer.disconnect()
            this._observer = null
        }
      }
    }
  }
}

class ShortsPlayerObserver {
  // Shorts player DOM element layout (video and controls):
  // #shorts-container > #shorts-inner-container > ytd-reel-video-renderer[id][is-active][show-player-controls] > #player-container
  //                                                                                                                            > ytd-player#player > #container.ytd-player > #shorts-player > .html5-video-container > video
  //                                                                                                                            > .player-controls > ytd-shorts-player-controls > yt-icon-button
  // #shorts-inner-container > ytd-reel-video-renderer is loaded and inserted in sets of 10
  // delayed async load and insert of #player-container > ytd-player#player

  /**
   * @param {(videoElement: HTMLVideoElement, controlsContainer: Element)} newPlayerCallback
   */
  constructor(newPlayerCallback) {
    /** @type {(videoElement: HTMLVideoElement, controlsContainer: Element)} */
    this._newPlayerCallback = newPlayerCallback
    /** @type {MutationObserver} */
    this._observer = new MutationObserver(this._onMutation.bind(this))
    this._observerVideo = new MutationObserver(this._onVideoMutation.bind(this))

    this._findAndObserve()
    document.addEventListener("yt-navigate-finish", this._findAndObserve.bind(this))
  }

  _findAndObserve() {
    let container = document.querySelector('#shorts-inner-container')
    if (!container) return
    this._observer.observe(container, { childList: true })
  }

  /**
   * @type {MutationCallback}
   */
  _onMutation(mutList, observer) {
    for (let mut of mutList) {
      if (mut.type !== 'childList') continue

      for (let newNode of mut.addedNodes) {
        if (newNode.nodeName !== 'YTD-REEL-VIDEO-RENDERER') continue

        let playerContainer = newNode.querySelector('#player-container')
        this._tryPlayerContainer(playerContainer)
      }
    }
  }

  _tryPlayerContainer(playerContainer) {
    let videoElement = playerContainer.querySelector('video')
    if (!videoElement) {
      this._observerVideo.observe(playerContainer, { childList: true })
      return
    }

    let controlsContainer = playerContainer.querySelector('.player-controls > ytd-shorts-player-controls')
    if (!controlsContainer) throw new Error('Unexpected: player controls container missing in player container')

    this._newPlayerCallback(videoElement, controlsContainer)
  }

  /**
   * @type {MutationCallback}
   */
  _onVideoMutation(mutList, observer) {
    for (let mut of mutList) {
      if (mut.type !== 'childList') continue

      for (let newNode of mut.addedNodes) {
        if (newNode.id !== 'player') continue

        let playerContainer = newNode.closest('#player-container')
        this._tryPlayerContainer(playerContainer)
      }
    }
  }
}

class Instance {
  /**
   * @param {HTMLVideoElement} video 
   * @param {Element} controlsContainer 
   */
  constructor(video, controlsContainer) {
    /** @type {HTMLVideoElement} */
    this._video = video
    this._controlsContainer = controlsContainer

    this._removeExisting()
    this._create()
    this._bind()
    this._updateRateDisplay()
    this._updateControlVisibility()
    this._insert()
  }
  _removeExisting() {
    let existing = this._controlsContainer.querySelector('.pbspeed-container')
    if (existing) existing.remove()
  }
  _create() {
    let container = document.createElement('div')
    container.className = 'pbspeed-container'
    container.style = 'margin:0 14px; display:flex; align-items: center; gap:12px;'

    let displayHTML = `<div class="rdisplay" style="grid-row: 1; grid-column: 1; font-size:120%; user-select: none;">⏱ <span class="pbspeed-value"></span></div>`
    if (!document.querySelector('#pbspeed-slider-style')) {
        const style = document.createElement('style');
        style.id = 'pbspeed-slider-style';
        style.textContent = `
            .pbspeed-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #6f6f6fff;
                cursor: pointer;
                border: none;
                box-shadow: 0 0 2px rgba(0,0,0,0.5);
            }
            .pbspeed-slider::-moz-range-thumb {
                width: 15px;
                height: 15px;
                border-radius: 50%;
                background: rgba(241, 241, 241, 0.8);
                cursor: pointer;
                border: 2px solid white;
                box-shadow: 0 0 2px rgba(0,0,0,0.5);
                border: none;
            }
        `;
        document.head.appendChild(style);
    }
    let sliderHTML = `<input id="slider" class="pbspeed-slider" type="range" min="0" max="5" step="0.05" style="grid-row: 1; grid-column: 3; width:7em; height:0.5em; -webkit-appearance:none; outline:none; opacity:0.70; background: rgba(70, 70, 70, 1); border-radius: 4px; cursor: pointer;"/>`
    // Control layout:
    // | Display | 0.25 0.50 0.75 1.00
    // | Current | 1.25 1.50 1.75 2.00
    let presetsHTML = `<div class="setrs" style="grid-row: 1; grid-column: 3; display: none; grid-template: 1fr 1fr / repeat(4, auto); column-gap: 6px;"><div>0.25</div><div>0.50</div><div>0.75</div><div>1.00</div><div>1.25</div><div>1.50</div><div>1.75</div><div>2.00</div></div>`
    container.innerHTML = `${displayHTML}${sliderHTML}${presetsHTML}`

    this._container = container
    this._display = container.querySelector('.rdisplay')
    this._rateDisplay = this._display.querySelector('.pbspeed-value')
    this._slider = container.querySelector('.pbspeed-slider')
    this._presets = container.querySelector('.setrs')
    
    // Styling children en-mass
    // container height 48px => element height 48 / 2 = 24 px
    for (let x of this._presets.childNodes) x.style = 'font-size: 14px; line-height: 24px; display: flex; align-items: center; cursor: pointer;'
  }
  _bind() {
    this._video.addEventListener('ratechange', this._updateRateDisplay.bind(this))

    for (let x of this._presets.childNodes) x.addEventListener('click', this._onPresetClick.bind(this))
  
    this._slider.addEventListener('input', this._onSliderInput.bind(this))
    
    this._display.addEventListener('click', this._onRdisplayClick.bind(this))
    this._display.style.cursor = 'pointer'

    // Slider Range aktualisieren
    this._updateSliderRange()
    
    // Auf Änderungen der Min/Max Werte reagieren
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && (changes['min-speed'] || changes['max-speed'])) {
            this._updateSliderRange()
        }
    })
  }
  async _updateSliderRange() {
    let values = await chrome.storage.local.get({ 
        'min-speed': 0, 
        'max-speed': 5.00 
    })
    
    this._slider.min = values['min-speed']
    this._slider.max = values['max-speed']
    this._slider.step = 0.05
  }
  _updateRateDisplay() {
    let value = this._video.playbackRate
    this._rateDisplay.innerText = `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`
    this._slider.value = value
  }
  _onPresetClick(e) {
    this._video.playbackRate = e.target.innerText
  }
  _onSliderInput(e) {
    this._video.playbackRate = e.target.value
  }
  _onRdisplayClick(e) {
    this._video.playbackRate = 1.0
  }
  async _updateControlVisibility() {
    let values = await chrome.storage.local.get({ 'show-slider': true, 'show-presets': false })
    this._presets.style.display = values['show-presets'] ? 'grid' : 'none'
    this._slider.style.display = values['show-slider'] ? 'block' : 'none'
  }
  _insert() {
    let timeDisplay = this._controlsContainer.querySelector('.ytp-time-display')
    if (timeDisplay) {
      timeDisplay.insertAdjacentElement('afterend', this._container)
      return true
    }
  
    this._controlsContainer.appendChild(this._container)
    return true
  }
}

const delay = ms => new Promise(res => setTimeout(res, ms));

let init = async () => {
  /**
   * @type {(videoElement: HTMLVideoElement, controlsContainer: Element)}
   */
  let onNewPlayer = (video, controlsContainer) => {
    console.debug('[YouTube Playback Speed Control] Identified elements, initializing controls…', video, controlsContainer)
    new Instance(video, controlsContainer)
  }
  new NormalPlayerObserver(onNewPlayer)
  new ShortsPlayerObserver(onNewPlayer)

  // backup 1
  await delay(5000);
  new NormalPlayerObserver(onNewPlayer)
  
  // backup 2
  await delay(10000);
  new NormalPlayerObserver(onNewPlayer)  
  
  // backup 3 (bro wtf, what machine do you have 🤯)
  await delay(30000);
  new NormalPlayerObserver(onNewPlayer)
}
init()