class NormalPlayerObserver {
	// ytd-watch-flexy > #player-theater-container > #player-container > ytd-player#ytd-player > #container > #movie_player
	//                                                                                                                      > .html5-video-container > video
	//                                                                                                                      > .ytp-chrome-bottom > .ytp-chrome-controls > .ytp-left-controls

	/**
	 * @param {(video: HTMLVideoElement, vcLeft: Element)} newPlayerCallback
	 */
	constructor(newPlayerCallback) {
		this._newPlayerCallback = newPlayerCallback;
		this._find();
	}
	_find() {
		if (this._tryIdentify()) return;
		document.addEventListener("yt-navigate-finish", this._onNavFinish.bind(this));
	}
	_tryIdentify() {
		let video = document.querySelector("video");
		if (!video) return false;

		let vcLeft = document.querySelector(".ytp-left-controls");
		if (!vcLeft) return false;

		this._newPlayerCallback(video, vcLeft);
		return true;
	}
	_onNavFinish() {
		if (this._navTimeout) clearTimeout(this._navTimeout);
		this._navTimeout = setTimeout(() => {
			this._navTimeout = null;
			this._tryIdentify();
		}, 500);
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
		this._newPlayerCallback = newPlayerCallback;
		/** @type {MutationObserver} */
		this._observer = new MutationObserver(this._onMutation.bind(this));
		this._observerVideo = new MutationObserver(this._onVideoMutation.bind(this));

		this._findAndObserve();
		document.addEventListener("yt-navigate-finish", this._findAndObserve.bind(this));
	}

	_findAndObserve() {
		let container = document.querySelector("#shorts-inner-container");
		if (!container) return;
		this._observer.observe(container, { childList: true });
	}

	/**
	 * @type {MutationCallback}
	 */
	_onMutation(mutList, observer) {
		for (let mut of mutList) {
			if (mut.type !== "childList") continue;

			for (let newNode of mut.addedNodes) {
				if (newNode.nodeName !== "YTD-REEL-VIDEO-RENDERER") continue;

				let playerContainer = newNode.querySelector("#player-container");
				this._tryPlayerContainer(playerContainer);
			}
		}
	}

	_tryPlayerContainer(playerContainer) {
		let videoElement = playerContainer.querySelector("video");
		if (!videoElement) {
			this._observerVideo.observe(playerContainer, { childList: true });
			return;
		}

		let controlsContainer = playerContainer.querySelector(".player-controls > ytd-shorts-player-controls");
		if (!controlsContainer) throw new Error("Unexpected: player controls container missing in player container");

		this._newPlayerCallback(videoElement, controlsContainer);
	}

	/**
	 * @type {MutationCallback}
	 */
	_onVideoMutation(mutList, observer) {
		for (let mut of mutList) {
			if (mut.type !== "childList") continue;

			for (let newNode of mut.addedNodes) {
				if (newNode.id !== "player") continue;

				let playerContainer = newNode.closest("#player-container");
				this._tryPlayerContainer(playerContainer);
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
		this._video = video;
		this._controlsContainer = controlsContainer;

		this._removeExisting();
		this._create();
		this._bind();
		this._loadSavedSpeed();
		this._updateRateDisplay();
		this._updateControlVisibility();
		this._insert();
	}

	async _loadSavedSpeed() {
		const values = await chrome.storage.local.get({ "save-speed": "always", "last-speed": 1.0 });
		console.debug("LOADED: ", values);

		if (values["save-speed"] === "always") {
			this._video.playbackRate = values["last-speed"];
		} else {
			this._video.playbackRate = 1.0;
		}
	}

	async _saveCurrentSpeed() {
		const values = await chrome.storage.local.get({ "save-speed": "always" });

		if (values["save-speed"] === "always") {
			chrome.storage.local.set({ "last-speed": this._video.playbackRate });
		}
	}

	_removeExisting() {
		let existing = this._controlsContainer.querySelector(".pbspeed-container");
		if (existing) existing.remove();
	}
	_create() {
		let container = document.createElement("div");
		container.className = "pbspeed-container";
		container.style = `
			margin: 8px;
			margin-left: 0;
			display: flex;
			padding: 0 4px;
			align-items: center;
			border-radius: 28px;
			background: rgba(0, 0, 0, 0.3);
		`;

		const speedIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" style="
			display: inline;
			vertical-align: middle;
			margin-right: 2px;
		" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 5v7l4 2.5"/></svg>`;
		let displayHTML = `<div class="rdisplay" style="
			font-size: 120%;
			user-select: none;
		">${speedIcon} <span class="pbspeed-value"></span></div>`;
		if (!document.querySelector("#pbspeed-slider-style")) {
			const style = document.createElement("style");
			style.id = "pbspeed-slider-style";
			style.textContent = `
            .pbspeed-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 1);
                cursor: pointer;
                border: none;
                box-shadow: 0 0 2px rgba(0,0,0,0.5);
            }
            .pbspeed-slider::-moz-range-thumb {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 1);
                cursor: pointer;
                border: none;
                box-shadow: 0 0 2px rgba(0,0,0,0.5);
            }
            .pbspeed-slider::-webkit-slider-runnable-track {
                height: 0.3em;
                border-radius: 4px;
                background: linear-gradient(to right, #fff var(--fill, 0%), #555 var(--fill, 0%));
            }
            .pbspeed-slider::-moz-range-track {
                height: 0.3em;
                border-radius: 4px;
                background: #555;
            }
            .pbspeed-slider::-moz-range-progress {
                height: 0.3em;
                border-radius: 4px;
                background: #fff;
            }
            .rdisplay {
                margin: 8px 0 !important;
                padding: 0 8px !important;
                border-radius: 28px !important;
                background:rgba(0, 0, 0, 0) !important;
                transition: background 0.2s !important;
                display: flex !important;
                align-items: center !important;
                height: 32px !important;
            }
            .rdisplay:hover {
                background: rgba(255, 255, 255, 0.1) !important;
            } 
            .pbspeed-slider {
                width: 0 !important;
                min-width: 0 !important;
                opacity: 0;
                margin: 0 !important;
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
                background: transparent !important;
                border: none !important;
                transition: width 0.3s ease, opacity 0.3s ease, margin 0.3s ease !important;
            }
            .pbspeed-container.slider-visible .pbspeed-slider {
                width: 5em !important;
                opacity: 1;
                margin: 12px !important;
            }
            .pbspeed-value {
                padding-left: 4px !important;
            }
        `;
			document.head.appendChild(style);
		}
		let sliderHTML = `<input id="slider" class="pbspeed-slider" type="range" min="0" max="5" step="0.1" style="
			height: 0.5em;
			-webkit-appearance: none;
			outline: none;
			border-radius: 4px;
			cursor: pointer;
		"/>`;
		container.innerHTML = `${displayHTML}${sliderHTML}`;

		this._container = container;
		this._display = container.querySelector(".rdisplay");
		this._rateDisplay = this._display.querySelector(".pbspeed-value");
		this._slider = container.querySelector(".pbspeed-slider");
	}
	_bind() {
		this._boundRateChange = this._updateRateDisplay.bind(this);
		this._video.addEventListener("ratechange", this._boundRateChange);

		this._slider.addEventListener("input", this._onSliderInput.bind(this));

		this._container.addEventListener("wheel", this._onSliderWheel.bind(this));

		this._display.addEventListener("click", this._onRdisplayClick.bind(this));
		this._display.style.cursor = "pointer";

		this._boundShowSlider = () => this._container.classList.add("slider-visible");
		this._boundHideSlider = () => this._container.classList.remove("slider-visible");
		this._chromeControls =
			this._controlsContainer.closest(".ytp-chrome-controls") || this._controlsContainer.parentElement;
		this._display.addEventListener("mouseenter", this._boundShowSlider);
		this._chromeControls.addEventListener("mouseleave", this._boundHideSlider);

		this._updateSliderRange();

		this._boundStorageChanged = (changes, area) => {
			if (area === "local" && (changes["min-speed"] || changes["max-speed"] || changes["wheel-step"])) {
				this._updateSliderRange();
			}
		};
		chrome.storage.onChanged.addListener(this._boundStorageChanged);
	}

	destroy() {
		this._video.removeEventListener("ratechange", this._boundRateChange);
		chrome.storage.onChanged.removeListener(this._boundStorageChanged);
		this._display.removeEventListener("mouseenter", this._boundShowSlider);
		this._chromeControls.removeEventListener("mouseleave", this._boundHideSlider);
		if (this._container && this._container.parentNode) {
			this._container.remove();
		}
	}
	async _updateSliderRange() {
		let values = await chrome.storage.local.get({
			"min-speed": 0,
			"max-speed": 5.0,
			"wheel-step": 0.1,
		});

		this._slider.min = values["min-speed"];
		this._slider.max = values["max-speed"];
		this._slider.step = values["wheel-step"];
		this._updateSliderFill();
	}
	_updateRateDisplay() {
		let value = this._video.playbackRate;
		this._rateDisplay.innerText = `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
		this._slider.value = value;
		this._updateSliderFill();
	}
	_onSliderInput(e) {
		this._video.playbackRate = parseFloat(e.target.value);
		this._saveCurrentSpeed();
	}
	_updateSliderFill() {
		const min = parseFloat(this._slider.min);
		const max = parseFloat(this._slider.max);
		const val = parseFloat(this._slider.value);
		const pct = max !== min ? ((val - min) / (max - min)) * 100 : 0;
		this._slider.style.setProperty("--fill", `${pct}%`);
	}
	_onSliderWheel(e) {
		e.preventDefault();

		chrome.storage.local.get({ "wheel-step": 0.1 }).then((values) => {
			const step = values["wheel-step"];
			const delta = e.deltaY > 0 ? -step : step;

			let newRate = parseFloat(this._slider.value) + delta;
			newRate = Math.max(parseFloat(this._slider.min), Math.min(parseFloat(this._slider.max), newRate));

			this._video.playbackRate = newRate;
			this._slider.value = newRate;
			this._updateRateDisplay();
			this._saveCurrentSpeed();
		});
	}
	_onRdisplayClick(e) {
		this._video.playbackRate = 1.0;
		this._saveCurrentSpeed();
	}
	async _updateControlVisibility() {
		let values = await chrome.storage.local.get({ "show-slider": true });
		this._slider.style.display = values["show-slider"] ? "block" : "none";
	}
	_insert() {
		let timeDisplay = this._controlsContainer.querySelector(".ytp-time-display");
		if (timeDisplay) {
			timeDisplay.insertAdjacentElement("afterend", this._container);
			return true;
		}

		this._controlsContainer.appendChild(this._container);
		return true;
	}
}

let init = () => {
	/**
	 * @type {(videoElement: HTMLVideoElement, controlsContainer: Element)}
	 */
	let currentInstance = null;
	/** @type {HTMLVideoElement|null} */
	let lastVideo = null;

	let onNewPlayer = (video, controlsContainer) => {
		console.debug(
			"[YouTube Playback Speed Control] Identified elements, initializing controls…",
			video,
			controlsContainer
		);
		if (video === lastVideo) return;
		lastVideo = video;
		if (currentInstance) currentInstance.destroy();
		currentInstance = new Instance(video, controlsContainer);
	};
	new NormalPlayerObserver(onNewPlayer);
	new ShortsPlayerObserver(onNewPlayer);

	const rebuildObserver = new MutationObserver(() => {
		const video = document.querySelector("video");
		const vcLeft = document.querySelector(".ytp-left-controls");
		if (video && vcLeft) {
			onNewPlayer(video, vcLeft);
		}
	});
	rebuildObserver.observe(document.body, { childList: true, subtree: true });
};
init();
