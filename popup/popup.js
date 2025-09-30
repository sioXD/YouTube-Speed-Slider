let minSpeed = document.getElementById('minSpeed')
let maxSpeed = document.getElementById('maxSpeed')
let wheelStep = document.getElementById('wheelStep')
let saveSpeed = document.getElementById('saveSpeed')
let minSpeedPlus = document.getElementById('minSpeedPlus')
let minSpeedMinus = document.getElementById('minSpeedMinus')
let maxSpeedPlus = document.getElementById('maxSpeedPlus')
let maxSpeedMinus = document.getElementById('maxSpeedMinus')
let wheelStepPlus = document.getElementById('wheelStepPlus')
let wheelStepMinus = document.getElementById('wheelStepMinus')
let resetBtn = document.getElementById('resetBtn')

// Standardwerte
const DEFAULT_VALUES = {
    'min-speed': 0,
    'max-speed': 5.00,
    'wheel-step': 0.05,
    'save-speed': 'never'
}

// Min Speed +/- Buttons
minSpeedPlus.addEventListener('click', () => {
    let value = parseFloat(minSpeed.value) + 0.25
    if (value < parseFloat(maxSpeed.value)) {
        minSpeed.value = value.toFixed(2)
        chrome.storage.local.set({ 'min-speed': value })
    }
})

minSpeedMinus.addEventListener('click', () => {
    let value = parseFloat(minSpeed.value) - 0.25
    if (value < parseFloat(maxSpeed.value) && value >= 0) {
        minSpeed.value = value.toFixed(2)
        chrome.storage.local.set({ 'min-speed': value })
    }
})

minSpeed.addEventListener('change', e => {
    let value = parseFloat(e.target.value)
    if (value < parseFloat(maxSpeed.value) && value >= 0) {
        chrome.storage.local.set({ 'min-speed': value })
    }
})

// Max Speed +/- Buttons
maxSpeedPlus.addEventListener('click', () => {
    let value = parseFloat(maxSpeed.value) + 0.25
    if (value > parseFloat(minSpeed.value)) {
        maxSpeed.value = value.toFixed(2)
        chrome.storage.local.set({ 'max-speed': value })
    }
})

maxSpeedMinus.addEventListener('click', () => {
    let value = parseFloat(maxSpeed.value) - 0.25
    if (value > parseFloat(minSpeed.value)) {
        maxSpeed.value = value.toFixed(2)
        chrome.storage.local.set({ 'max-speed': value })
    }
})

maxSpeed.addEventListener('change', e => {
    let value = parseFloat(e.target.value)
    if (value > parseFloat(minSpeed.value)) {
        chrome.storage.local.set({ 'max-speed': value })
    }
})

// Wheel Step +/- Buttons
wheelStepPlus.addEventListener('click', () => {
    let value = parseFloat(wheelStep.value) + 0.05
    if (value > 0) {
        wheelStep.value = value.toFixed(2)
        chrome.storage.local.set({ 'wheel-step': value })
    }
})

wheelStepMinus.addEventListener('click', () => {
    let value = parseFloat(wheelStep.value) - 0.05
    if (value > 0) {
        wheelStep.value = value.toFixed(2)
        chrome.storage.local.set({ 'wheel-step': value })
    }
})

wheelStep.addEventListener('change', e => {
    let value = parseFloat(e.target.value)
    if (value > 0) {
        chrome.storage.local.set({ 'wheel-step': value })
    }
})

// Save Speed Option
saveSpeed.addEventListener('change', e => {
    chrome.storage.local.set({ 'save-speed': e.target.value })
    chrome.storage.local.remove('last-speed')
})

resetBtn.addEventListener('click', async () => {
    // Bestätigungsdialog
    if (confirm('Reset all settings to default values?')) {
        // Setze alle Werte auf Standard
        await chrome.storage.local.set(DEFAULT_VALUES)
        await chrome.storage.local.remove('last-speed') // for changing videos
        
        // Aktualisiere die UI
        await updateUI()
        
        // Seite neu laden um Änderungen sofort zu sehen
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0].url.includes('youtube.com')) {
                chrome.tabs.reload(tabs[0].id)
            }
        });
    }
})

async function updateUI() {
    let values = await chrome.storage.local.get(DEFAULT_VALUES)
    
    minSpeed.value = values['min-speed'].toFixed(2)
    maxSpeed.value = values['max-speed'].toFixed(2)
    wheelStep.value = values['wheel-step'].toFixed(2)
    saveSpeed.value = values['save-speed']
}

// Initialisierung
updateUI()