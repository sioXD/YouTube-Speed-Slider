let slider = document.getElementById('slider')
let presets = document.getElementById('presets')

slider.addEventListener('change', e => chrome.storage.local.set({ 'show-slider': e.target.checked }))
presets.addEventListener('change', e => chrome.storage.local.set({ 'show-presets': e.target.checked }))

async function init() {
    let values = await chrome.storage.local.get({ 'show-slider': true, 'show-presets': false })
    slider.checked = values['show-slider']
    presets.checked = values['show-presets']
}
init()