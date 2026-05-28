// ============================================
// 🧠 SuperBank - The Brain of our Banking App!
// ============================================
// NOW WITH FIREBASE! 🔥
// Firebase Auth = real login/signup with email & password
// Firestore = saves your money data on the internet!

// ============================================
// 🔥 STEP 0: IMPORT FIREBASE TOOLS
// ============================================
// We're pulling in tools from Firebase's toolbox on the internet.
// Think of it like borrowing magic wands! 🪄

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp,
    onSnapshot,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";


// ============================================
// 🔑 STEP 1: FIREBASE CONFIG (Your Secret Keys!)
// ============================================
// This is like the address of YOUR specific Firebase house.
// Every app has its own unique address!

const firebaseConfig = {
    apiKey: "AIzaSyAxDluxmzrnJ5O6yC0cVocRBHwzFPo5RhA",
    authDomain: "superbank-9a49f.firebaseapp.com",
    projectId: "superbank-9a49f",
    storageBucket: "superbank-9a49f.firebasestorage.app",
    messagingSenderId: "748166493607",
    appId: "1:748166493607:web:0fb5f9dad8eb6822807282"
};

// Turn on Firebase!
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);       // The bouncer / security guard 🔒
const db = getFirestore(app);    // The vault / safe 🏦

console.log("🔥 Firebase is connected and ready!");


// ============================================
// 🔧 STEP 2: GRAB ALL THE HTML ELEMENTS
// ============================================

// Pages
const loginPage     = document.getElementById('login-page');
const signupPage    = document.getElementById('signup-page');
const dashboardPage = document.getElementById('dashboard-page');

// Forms
const loginForm  = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

// Page switching links
const showSignupLink = document.getElementById('show-signup');
const showLoginLink  = document.getElementById('show-login');

// Dashboard elements
const welcomeName     = document.getElementById('welcome-name');
const balanceAmount   = document.getElementById('balance-amount');
const logoutBtn       = document.getElementById('logout-btn');
const transactionList = document.getElementById('transaction-list');
const noTransactions  = document.getElementById('no-transactions');

// Action buttons
const showDepositBtn  = document.getElementById('show-deposit');
const showWithdrawBtn = document.getElementById('show-withdraw');
const showTransferBtn = document.getElementById('show-transfer');

// Modals
const depositModal  = document.getElementById('deposit-modal');
const withdrawModal = document.getElementById('withdraw-modal');
const transferModal = document.getElementById('transfer-modal');

// Modal inputs
const depositAmountInput  = document.getElementById('deposit-amount');
const withdrawAmountInput = document.getElementById('withdraw-amount');
const transferEmailInput  = document.getElementById('transfer-email');
const transferAmountInput = document.getElementById('transfer-amount');

// Modal buttons
const depositConfirm  = document.getElementById('deposit-confirm');
const depositCancel   = document.getElementById('deposit-cancel');
const withdrawConfirm = document.getElementById('withdraw-confirm');
const withdrawCancel  = document.getElementById('withdraw-cancel');
const transferConfirm = document.getElementById('transfer-confirm');
const transferCancel  = document.getElementById('transfer-cancel');

// Toast
const toast        = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Notifications
const notifBtn      = document.getElementById('notif-btn');
const notifBadge    = document.getElementById('notif-badge');
const notifDropdown = document.getElementById('notif-dropdown');
const notifList     = document.getElementById('notif-list');

// Toggle Notifications Menu
if(notifBtn) {
    notifBtn.addEventListener('click', () => {
        notifDropdown.classList.toggle('hidden');
        notifBadge.classList.add('hidden'); // Clear badge when opened
    });
}

// ============================================
// 💾 STEP 3: OUR DATA VARIABLES
// ============================================

let currentUser = null;   // The Firebase user object
let userRole = 'user';     // The user's role (user or admin)
let userName = '';         // The user's display name
let balance = 0;           // How much money they have
let transactions = [];     // List of all money moves


// ============================================
// 🔀 STEP 4: HELPER FUNCTIONS
// ============================================

// --- Show a specific page ---
function showPage(page) {
    loginPage.classList.remove('active');
    loginPage.classList.add('hidden');
    signupPage.classList.remove('active');
    signupPage.classList.add('hidden');
    dashboardPage.classList.remove('active');
    dashboardPage.classList.add('hidden');

    page.classList.remove('hidden');
    page.classList.add('active');
}

// --- Toast notification ---
function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// --- Format balance as Naira ---
function updateBalance() {
    balanceAmount.textContent = '₦' + balance.toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// --- Draw transaction list ---
function renderTransactions() {
    if (transactions.length === 0) {
        noTransactions.classList.remove('hidden');
        const items = transactionList.querySelectorAll('.transaction-item');
        items.forEach(item => item.remove());
        return;
    }

    noTransactions.classList.add('hidden');
    const oldItems = transactionList.querySelectorAll('.transaction-item');
    oldItems.forEach(item => item.remove());

    transactions.forEach(tx => {
        let icon, bgColor, amountClass, amountPrefix;

        if (tx.type === 'deposit') {
            icon = '💵'; bgColor = 'rgba(56, 239, 125, 0.15)';
            amountClass = 'positive'; amountPrefix = '+';
        } else if (tx.type === 'withdraw') {
            icon = '🏧'; bgColor = 'rgba(248, 113, 113, 0.15)';
            amountClass = 'negative'; amountPrefix = '-';
        } else {
            icon = '📤'; bgColor = 'rgba(167, 139, 250, 0.15)';
            amountClass = 'negative'; amountPrefix = '-';
        }

        const div = document.createElement('div');
        div.className = 'transaction-item';
        div.innerHTML = `
            <div class="tx-icon" style="background: ${bgColor}">${icon}</div>
            <div class="tx-details">
                <div class="tx-type">${tx.description}</div>
                <div class="tx-date">${tx.date} • ${tx.time}</div>
            </div>
            <div class="tx-amount ${amountClass}">
                ${amountPrefix}₦${tx.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </div>
        `;
        transactionList.appendChild(div);
    });
}


// ============================================
// 🔥 STEP 5: FIREBASE - SAVE & LOAD DATA
// ============================================
// Instead of localStorage, we now save to Firestore!
// Firestore is like a giant notebook on the internet
// that remembers everything even if you close the browser.

// --- Save data TO Firestore ---
async function saveToFirestore() {
    if (!currentUser) return;

    try {
        // doc(db, "collection", "document_id")
        // We create a "users" collection, and each user gets their own document
        await setDoc(doc(db, "users", currentUser.uid), {
            name: userName,
            email: currentUser.email,
            balance: balance,
            transactions: transactions
        });
        console.log("✅ Data saved to Firestore!");
    } catch (error) {
        console.error("❌ Error saving to Firestore:", error);
        showToast("⚠️ Couldn't save to cloud. Don't worry, trying again...");
    }
}

// --- Load data FROM Firestore ---
let userDocUnsubscribe = null;

async function loadFromFirestore() {
    if (!currentUser) return;
    
    if (userDocUnsubscribe) {
        userDocUnsubscribe();
    }
    
    return new Promise((resolve, reject) => {
        try {
            userDocUnsubscribe = onSnapshot(doc(db, "users", currentUser.uid), async (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    
                    if (data.status === 'suspended') {
                        showToast('❌ Your account has been suspended by an Administrator.');
                        if (userDocUnsubscribe) userDocUnsubscribe();
                        await signOut(auth);
                        resolve(); 
                        return;
                    }

                    userRole = data.role || 'user';
                    userName = data.name || currentUser.email.split('@')[0];
                    balance = data.balance || 0;
                    transactions = data.transactions || [];
                    
                    // If the user is currently looking at the dashboard, update it instantly!
                    if (!dashboardPage.classList.contains('hidden')) {
                         updateBalance();
                         renderTransactions();
                    }
                    resolve();
                } else {
                    userName = currentUser.email.split('@')[0];
                    balance = 0;
                    transactions = [];
                    await saveToFirestore();
                    resolve();
                }
            }, (error) => {
                console.error("❌ Real-time update error:", error);
                reject(error);
            });
        } catch (error) {
            console.error("❌ Listener setup error:", error);
            reject(error);
        }
    });
}

// --- Add a transaction and save ---
async function addTransaction(type, amount, description) {
    const now = new Date();
    const transaction = {
        type: type,
        amount: amount,
        description: description,
        date: now.toLocaleDateString('en-NG', { 
            day: 'numeric', month: 'short', year: 'numeric' 
        }),
        time: now.toLocaleTimeString('en-NG', { 
            hour: '2-digit', minute: '2-digit' 
        })
    };

    transactions.unshift(transaction);
    renderTransactions();
    await saveToFirestore(); // Save to the cloud! ☁️
    
    // Log the action for the Admin Panel
    await addActivityLog(type.toUpperCase(), `₦${amount} - ${description}`);
}

// --- Activity Log Helper ---
async function addActivityLog(action, details) {
    if (!currentUser) return;
    try {
        await addDoc(collection(db, "activity_logs"), {
            action_type: action,
            details: details,
            user_email: currentUser.email,
            timestamp: serverTimestamp()
        });
    } catch(err) { console.error("Log error", err); }
}

// --- Notifications Helper ---
let notifUnsubscribe = null;
function loadNotifications() {
    if (!currentUser) return;
    
    // Listen to all notifications (we filter on client side for simplicity)
    const q = query(collection(db, "notifications"), orderBy("timestamp", "desc"));
    
    notifUnsubscribe = onSnapshot(q, (snapshot) => {
        if (!notifList || !notifBadge) return;
        
        notifList.innerHTML = '';
        let count = 0;
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.target === 'all' || data.target === currentUser.email) {
                count++;
                notifList.innerHTML += `
                    <div class="px-4 py-3 border-b border-gray-700 hover:bg-gray-700 transition">
                        <div class="font-bold text-sm text-blue-300">🔔 ${data.title}</div>
                        <div class="text-xs text-gray-400 mt-1">${data.message}</div>
                    </div>
                `;
            }
        });
        
        if (count === 0) {
            notifList.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">No new messages.</p>';
        } else {
            notifBadge.classList.remove('hidden');
        }
    });
}


// ============================================
// 👀 STEP 6: AUTH STATE WATCHER
// ============================================
// This is like a security camera that watches the door.
// Whenever someone logs in or out, this function runs!

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Someone is logged in! 🎉
        currentUser = user;
        console.log("👤 User detected:", user.email);

        // Load their data from Firestore
        await loadFromFirestore();

        // If loadFromFirestore executed a signOut (e.g. suspended user), currentUser will be changed shortly.
        // But let's only proceed if the user is not suspended (balance variable is a good proxy, or just basic check)
        if (!currentUser) return;

        // Initialize user-side features
        loadNotifications();
        await addActivityLog("Login", "User logged into the main app.");

        // --- ADMIN REDIRECT ---
        // If this is an admin, redirect them directly to the admin dashboard,
        // UNLESS they specifically clicked the "view=user" link from the admin page
        if (userRole === 'admin') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('view') !== 'user') {
                window.location.href = 'admin.html';
                return;
            }
        }

        // Update the dashboard
        welcomeName.textContent = 'Hi, ' + userName + '! 👋';
        updateBalance();
        renderTransactions();
        showPage(dashboardPage);
    } else {
        // No one is logged in
        currentUser = null;
        showPage(loginPage);
    }
});


// ============================================
// 🎧 STEP 7: EVENT LISTENERS
// ============================================

// --- Page Switching ---
showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    showPage(signupPage);
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    showPage(loginPage);
});

// --- SIGNUP (Now with REAL Firebase Auth!) ---
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
        showToast('Creating your account... ⏳');
        
        // This talks to Firebase and creates a REAL account!
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;
        userName = name;
        balance = 0;
        transactions = [];
        
        // Save the name to Firestore
        await saveToFirestore();
        await addActivityLog("Signup", "New user registered an account.");
        
        // The onAuthStateChanged watcher will handle showing the dashboard!
        showToast('Welcome to SuperBank, ' + name + '! 🎉');
    } catch (error) {
        console.error("Signup error:", error);
        
        // Show friendly error messages
        if (error.code === 'auth/email-already-in-use') {
            showToast('❌ This email is already taken! Try logging in.');
        } else if (error.code === 'auth/weak-password') {
            showToast('❌ Password too short! Use 6+ characters.');
        } else if (error.code === 'auth/invalid-email') {
            showToast('❌ That email doesn\'t look right. Try again!');
        } else {
            showToast('❌ Oops! ' + error.message);
        }
    }
});

// --- LOGIN (Now with REAL Firebase Auth!) ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        showToast('Logging in... ⏳');
        
        // This talks to Firebase and checks the password!
        await signInWithEmailAndPassword(auth, email, password);
        
        // The onAuthStateChanged watcher will handle the rest!
        showToast('Welcome back! 🎉');
    } catch (error) {
        console.error("Login error:", error);
        
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            showToast('❌ Wrong email or password! Try again.');
        } else if (error.code === 'auth/too-many-requests') {
            showToast('❌ Too many tries! Wait a minute and try again.');
        } else {
            showToast('❌ Oops! ' + error.message);
        }
    }
});

// --- LOGOUT (Firebase signs them out!) ---
logoutBtn.addEventListener('click', async () => {
    try {
        if (notifUnsubscribe) notifUnsubscribe();
        await addActivityLog("Logout", "User manually logged out.");
        
        await signOut(auth);
        currentUser = null;
        balance = 0;
        transactions = [];
        loginForm.reset();
        signupForm.reset();
        showToast('Logged out. See you soon! 👋');
    } catch (error) {
        showToast('❌ Error logging out: ' + error.message);
    }
});

// --- Open Modals ---
showDepositBtn.addEventListener('click', () => {
    depositAmountInput.value = '';
    depositModal.classList.remove('hidden');
});
showWithdrawBtn.addEventListener('click', () => {
    withdrawAmountInput.value = '';
    withdrawModal.classList.remove('hidden');
});
showTransferBtn.addEventListener('click', () => {
    transferEmailInput.value = '';
    transferAmountInput.value = '';
    transferModal.classList.remove('hidden');
});

// --- Close Modals ---
depositCancel.addEventListener('click', () => depositModal.classList.add('hidden'));
withdrawCancel.addEventListener('click', () => withdrawModal.classList.add('hidden'));
transferCancel.addEventListener('click', () => transferModal.classList.add('hidden'));

// --- DEPOSIT (Now saves to Firestore!) ---
depositConfirm.addEventListener('click', async () => {
    const amount = parseFloat(depositAmountInput.value);
    
    if (!amount || amount <= 0) {
        showToast('⚠️ Please enter a valid amount!');
        return;
    }

    balance += amount;
    updateBalance();
    await addTransaction('deposit', amount, 'Deposit');
    depositModal.classList.add('hidden');
    showToast('💵 ₦' + amount.toLocaleString() + ' deposited successfully!');
});

// --- WITHDRAW (Now saves to Firestore!) ---
withdrawConfirm.addEventListener('click', async () => {
    const amount = parseFloat(withdrawAmountInput.value);
    
    if (!amount || amount <= 0) {
        showToast('⚠️ Please enter a valid amount!');
        return;
    }
    if (amount > balance) {
        showToast('❌ Not enough money! You only have ₦' + balance.toLocaleString());
        return;
    }

    balance -= amount;
    updateBalance();
    await addTransaction('withdraw', amount, 'Withdrawal');
    withdrawModal.classList.add('hidden');
    showToast('🏧 ₦' + amount.toLocaleString() + ' withdrawn successfully!');
});

// --- TRANSFER (Now ACTUALLY sends money to the recipient!) ---
transferConfirm.addEventListener('click', async () => {
    const email = transferEmailInput.value.trim().toLowerCase();
    const amount = parseFloat(transferAmountInput.value);
    
    if (!email) {
        showToast("⚠️ Please enter your friend's email!");
        return;
    }
    if (!amount || amount <= 0) {
        showToast('⚠️ Please enter a valid amount!');
        return;
    }
    if (amount > balance) {
        showToast('❌ Not enough money! You only have ₦' + balance.toLocaleString());
        return;
    }
    // Can't send money to yourself!
    if (email === currentUser.email.toLowerCase()) {
        showToast('❌ You can\'t transfer money to yourself!');
        return;
    }

    try {
        showToast('📤 Sending money... ⏳');

        // 🔍 FIND THE RECIPIENT in Firestore by their email
        // We search the "users" collection for a document where email matches
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        // Check if we found the recipient
        if (querySnapshot.empty) {
            showToast('❌ No SuperBank account found with that email!');
            return;
        }

        // Get the recipient's document
        const recipientDoc = querySnapshot.docs[0];
        const recipientData = recipientDoc.data();
        const recipientId = recipientDoc.id;

        // 📝 Create timestamp for both transactions
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-NG', { 
            day: 'numeric', month: 'short', year: 'numeric' 
        });
        const timeStr = now.toLocaleTimeString('en-NG', { 
            hour: '2-digit', minute: '2-digit' 
        });

        // 💸 STEP 1: Subtract from SENDER (you)
        balance -= amount;
        updateBalance();

        const senderTransaction = {
            type: 'transfer',
            amount: amount,
            description: 'Transfer to ' + email,
            date: dateStr,
            time: timeStr
        };
        transactions.unshift(senderTransaction);
        renderTransactions();
        await saveToFirestore();

        // 💰 STEP 2: Add to RECIPIENT (your friend)
        const recipientBalance = (recipientData.balance || 0) + amount;
        const recipientTransactions = recipientData.transactions || [];
        
        // Add an incoming transaction to their history
        recipientTransactions.unshift({
            type: 'deposit',
            amount: amount,
            description: 'Transfer from ' + currentUser.email,
            date: dateStr,
            time: timeStr
        });

        // Save the updated data to the recipient's Firestore document
        await setDoc(doc(db, "users", recipientId), {
            ...recipientData,
            balance: recipientBalance,
            transactions: recipientTransactions
        });

        // 📝 Log the incoming money for the recipient so admins can see it
        try {
            await addDoc(collection(db, "activity_logs"), {
                action_type: "RECEIVED",
                details: `₦${amount} - Transfer from ${currentUser.email}`,
                user_email: email,
                timestamp: serverTimestamp()
            });
        } catch(err) { console.error("Logging error", err); }

        transferModal.classList.add('hidden');
        showToast('📤 ₦' + amount.toLocaleString() + ' sent to ' + email + '! ✅');
        console.log('✅ Transfer complete! Recipient balance updated.');

    } catch (error) {
        console.error('❌ Transfer error:', error);
        showToast('❌ Transfer failed: ' + error.message);
    }
});

// --- Close modals when clicking outside ---
[depositModal, withdrawModal, transferModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
});


// ============================================
// 🚀 STEP 8: READY!
// ============================================
console.log('🧠 SuperBank brain is awake and ready!');
console.log('🔥 Firebase Auth + Firestore connected!');
console.log('🏦 Welcome to SuperBank!');
