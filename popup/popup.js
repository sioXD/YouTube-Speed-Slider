let minSpeed = document.getElementById('minSpeed')
let maxSpeed = document.getElementById('maxSpeed')
let minSpeedPlus = document.getElementById('minSpeedPlus')
let minSpeedMinus = document.getElementById('minSpeedMinus')
let maxSpeedPlus = document.getElementById('maxSpeedPlus')
let maxSpeedMinus = document.getElementById('maxSpeedMinus')
let resetBtn = document.getElementById('resetBtn')

// Standardwerte
const DEFAULT_VALUES = {
    'min-speed': 0,
    'max-speed': 5.00
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
    if (value < parseFloat(maxSpeed.value) && value > 0) {
        minSpeed.value = value.toFixed(2)
        chrome.storage.local.set({ 'min-speed': value })
    }
})

minSpeed.addEventListener('change', e => {
    let value = parseFloat(e.target.value)
    if (value < parseFloat(maxSpeed.value) && value > 0) {
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

resetBtn.addEventListener('click', async () => {
    // Bestätigungsdialog
    if (confirm('Reset all settings to default values?')) {
        // Setze alle Werte auf Standard
        await chrome.storage.local.set(DEFAULT_VALUES)
        
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
}

// Initialisierung
updateUI()