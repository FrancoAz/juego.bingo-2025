// Firebase configuration
// Replace with your actual Firebase config
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const bingoGrids = document.querySelectorAll('.bingo-grid');
const countdowns = document.querySelectorAll('.countdown');
const modal = document.getElementById('confirmationModal');
const closeModalBtn = document.querySelector('.close-modal');
const closeBtn = document.querySelector('.close-btn');
const reservedNumberSpan = document.getElementById('reservedNumber');
const viewNumbersBtns = document.querySelectorAll('.view-numbers-btn');

// State Management
let selectedNumbers = {
    1: null,
    2: null
};

// Tab Switching
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked button and corresponding content
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});

// Generate Bingo Grids
function generateBingoGrid(gridElement, bingoId) {
    for (let i = 1; i <= 80; i++) {
        const numberButton = document.createElement('button');
        numberButton.classList.add('bingo-number');
        numberButton.textContent = i;
        numberButton.dataset.number = i;
        
        numberButton.addEventListener('click', () => selectBingoNumber(numberButton, bingoId));
        
        gridElement.appendChild(numberButton);
    }
    
    // Load occupied numbers from Firestore
    loadOccupiedNumbers(gridElement, bingoId);
}

// Load occupied numbers from Firestore
function loadOccupiedNumbers(gridElement, bingoId) {
    // Predefined occupied numbers for Bingo 1
    const predefinedOccupiedNumbers = {
        1: [1, 2, 3, 4, 6, 7, 8,13, 17, 20, 22, 26, 27, 30, 33, 35, 36, 40, 50, 57, 60, 66, 69, 70, 77, 79, 80]
    };
    
    // Mark predefined numbers as occupied for this bingo
    if (predefinedOccupiedNumbers[bingoId]) {
        predefinedOccupiedNumbers[bingoId].forEach(num => {
            const numberButton = gridElement.querySelector(`[data-number="${num}"]`);
            if (numberButton) {
                numberButton.classList.add('occupied');
                numberButton.style.backgroundColor = 'red'; // Set color to red instead of default gray
            }
        });
    }
    
    db.collection(`bingo${bingoId}`)
        .get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const occupiedNumber = doc.id;
                const numberButton = gridElement.querySelector(`[data-number="${occupiedNumber}"]`);
                if (numberButton) {
                    numberButton.classList.add('occupied');
                }
            });
        })
        .catch((error) => {
            console.error("Error loading occupied numbers: ", error);
        });
}

// Select Bingo Number
function selectBingoNumber(button, bingoId) {
    // Check if number is already occupied
    if (button.classList.contains('occupied')) {
        return;
    }
    
    const number = button.dataset.number;
    
    // Clear previous selection
    document.querySelectorAll(`.bingo-grid[data-bingo="${bingoId}"] .bingo-number.selected`).forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Select the new number
    button.classList.add('selected');
    selectedNumbers[bingoId] = number;
    
    // Update the form
    const selectedNumberSpan = document.querySelector(`#bingo${bingoId} .selected-number`);
    selectedNumberSpan.textContent = number;
    
    // Enable the submit button
    const submitBtn = document.querySelector(`#bingo${bingoId}Form .submit-btn`);
    submitBtn.disabled = false;
}

// Initialize Bingo Grids
bingoGrids.forEach(grid => {
    const bingoId = grid.getAttribute('data-bingo');
    generateBingoGrid(grid, bingoId);
});

// Handle Form Submissions
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', handleFormSubmit);
});

function handleFormSubmit(event) {
    // Form now submits to FormSubmit service
    const form = event.target;
    const bingoId = form.id.replace('Form', '');
    const number = selectedNumbers[bingoId.slice(-1)];
    
    if (!number) {
        alert('Por favor, selecciona un número para participar.');
        event.preventDefault();
        return;
    }
    
    // Add selected number to form submission
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = 'numero_seleccionado';
    hiddenInput.value = number;
    form.appendChild(hiddenInput);
    
    // Show confirmation modal after small delay to allow form submission
    setTimeout(() => {
        reservedNumberSpan.textContent = number;
        modal.classList.add('show');
    }, 500);
}

// Update Countdowns
function updateCountdowns() {
    countdowns.forEach(countdown => {
        const targetDate = new Date(countdown.getAttribute('data-date')).getTime();
        const now = new Date().getTime();
        const distance = targetDate - now;
        
        if (distance < 0) {
            countdown.innerHTML = '<div class="countdown-ended">¡El sorteo ha finalizado!</div>';
            return;
        }
        
        // Calculate days, hours, minutes and seconds
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        // Update countdown display
        countdown.querySelector('.days').textContent = days.toString().padStart(2, '0');
        countdown.querySelector('.hours').textContent = hours.toString().padStart(2, '0');
        countdown.querySelector('.minutes').textContent = minutes.toString().padStart(2, '0');
        countdown.querySelector('.seconds').textContent = seconds.toString().padStart(2, '0');
    });
}

// Update countdowns every second
setInterval(updateCountdowns, 1000);
updateCountdowns(); // Initial update

// Modal Close Events
closeModalBtn.addEventListener('click', () => {
    modal.classList.remove('show');
});

closeBtn.addEventListener('click', () => {
    modal.classList.remove('show');
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.classList.remove('show');
    }
});

// Smooth Scroll for Navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 100,
                behavior: 'smooth'
            });
        }
    });
});

// View occupied numbers functionality
viewNumbersBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const bingoId = btn.getAttribute('data-bingo');
        const bingoGrid = document.querySelector(`.bingo-grid[data-bingo="${bingoId}"]`);
        
        // Scroll to bingo grid
        bingoGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Highlight occupied numbers with animation
        const occupiedNumbers = bingoGrid.querySelectorAll('.bingo-number.occupied');
        occupiedNumbers.forEach(num => {
            num.style.animation = 'pulse 1s';
            setTimeout(() => {
                num.style.animation = '';
            }, 1000);
        });
    });
});

// Add pulse animation
const style = document.createElement('style');
style.textContent = `
@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); box-shadow: 0 0 10px rgba(255, 0, 0, 0.5); }
    100% { transform: scale(1); }
}`;
document.head.appendChild(style);