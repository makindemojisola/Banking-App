// ============================================
// 🛡️ SuperBank Admin Panel Logic
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { 
    getFirestore, doc, getDoc, getDocs, updateDoc, deleteDoc, collection, 
    query, where, addDoc, orderBy, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAxDluxmzrnJ5O6yC0cVocRBHwzFPo5RhA",
    authDomain: "superbank-9a49f.firebaseapp.com",
    projectId: "superbank-9a49f",
    storageBucket: "superbank-9a49f.firebasestorage.app",
    messagingSenderId: "748166493607",
    appId: "1:748166493607:web:0fb5f9dad8eb6822807282"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global state
let currentAdmin = null;
let allUsers = [];

// DOM Elements
const authOverlay = document.getElementById('auth-overlay');
const authMessage = document.getElementById('auth-status-message');
const authLoginBtn = document.getElementById('auth-login-btn');
const sidebar = document.getElementById('admin-sidebar');
const mainContent = document.getElementById('admin-main');
const adminNameEl = document.getElementById('admin-name');
const logoutBtn = document.getElementById('admin-logout-btn');

function showToast(msg) {
    const toast = document.getElementById('admin-toast');
    document.getElementById('toast-message').textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ============================================
// 1️⃣ AUTHENTICATION & ROLE CHECK
// ============================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.role === 'admin') {
                    // Success! User is admin.
                    currentAdmin = { uid: user.uid, ...userData };
                    
                    // Show dashboard
                    authOverlay.classList.add('hidden');
                    sidebar.classList.remove('hidden');
                    mainContent.classList.remove('hidden');
                    adminNameEl.textContent = userData.name || userData.email;
                    document.getElementById('admin-profile-name').value = userData.name || '';
                    document.getElementById('admin-profile-email').value = userData.email || '';
                    
                    // Load default tab
                    loadUsers();
                    logActivity("Admin Login", "Admin successfully logged into panel.");
                } else {
                    // Logged in, but NOT an admin.
                    authMessage.textContent = "Access Denied ❌";
                    authOverlay.querySelector('p').textContent = "You do not have administrator privileges.";
                    authLoginBtn.classList.remove('hidden');
                    authLoginBtn.textContent = "Return to App";
                    authLoginBtn.onclick = () => window.location.href = "index.html";
                }
            } else {
                authMessage.textContent = "Error: User profile not found.";
                authLoginBtn.classList.remove('hidden');
                authLoginBtn.onclick = () => window.location.href = "index.html";
            }
        } catch (err) {
            console.error("Auth check error:", err);
            authMessage.textContent = "Error verifying access.";
        }
    } else {
        // Not logged in at all
        authMessage.textContent = "Please Login First";
        authOverlay.querySelector('p').textContent = "You must be logged in to access the admin panel.";
        authLoginBtn.classList.remove('hidden');
        authLoginBtn.onclick = () => window.location.href = "index.html";
    }
});

logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = "index.html";
});

// ============================================
// 2️⃣ SIDEBAR NAVIGATION
// ============================================
const navBtns = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.admin-section');

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Update active button
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Show correct section
        const targetId = 'section-' + btn.getAttribute('data-target');
        sections.forEach(sec => {
            sec.classList.add('hidden');
            sec.classList.remove('active');
        });
        document.getElementById(targetId).classList.add('active');
        document.getElementById(targetId).classList.remove('hidden');
        
        // Dynamic loading
        const target = btn.getAttribute('data-target');
        document.getElementById('page-title').textContent = btn.innerText;
        
        if (target === 'users') loadUsers();
        if (target === 'transactions') loadAllTransactions();
        if (target === 'activity') loadActivityLogs();
    });
});

// ============================================
// 3️⃣ USER MANAGEMENT (A4)
// ============================================
let unsubUsers = null;
function loadUsers() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    
    // Only show loading if empty
    if (!tbody.innerHTML.trim()) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-400">Loading users...</td></tr>';
    }
    
    if (unsubUsers) unsubUsers();
    
    try {
        unsubUsers = onSnapshot(collection(db, "users"), (querySnapshot) => {
            allUsers = [];
            tbody.innerHTML = '';
            
            if (querySnapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-400">No users found.</td></tr>';
                return;
            }

            querySnapshot.forEach((documentSnapshot) => {
                const user = { id: documentSnapshot.id, ...documentSnapshot.data() };
                allUsers.push(user);
                
                const tr = document.createElement('tr');
                
                // Badges
                const roleBadge = user.role === 'admin' ? '<span class="badge badge-admin">Admin</span>' : '<span class="badge badge-user">User</span>';
                const statusBadge = user.status === 'suspended' ? '<span class="badge badge-suspended">Suspended</span>' : '<span class="badge badge-active">Active</span>';
                const balanceFmt = '₦' + (user.balance || 0).toLocaleString('en-NG', {minimumFractionDigits: 2});
                
                // Action Buttons
                let actions = '';
                // Don't let admin delete/suspend themselves easily
                if (user.id !== currentAdmin.uid) {
                    if (user.status === 'suspended') {
                        actions += `<button class="action-btn-sm activate" onclick="window.setUserStatus('${user.id}', 'active')">Activate</button>`;
                    } else {
                        actions += `<button class="action-btn-sm suspend" onclick="window.setUserStatus('${user.id}', 'suspended')">Suspend</button>`;
                    }
                    
                    // Add promote/demote button
                    if (user.role === 'admin') {
                        actions += `<button class="action-btn-sm bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30" onclick="window.setUserRole('${user.id}', 'user')">Demote Admin</button>`;
                    } else {
                        actions += `<button class="action-btn-sm bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30" onclick="window.setUserRole('${user.id}', 'admin')">Make Admin</button>`;
                    }
                    
                    actions += `<button class="action-btn-sm delete" onclick="window.deleteUser('${user.id}')">Delete</button>`;
                } else {
                    actions = '<span class="text-xs text-gray-500">Self (No actions)</span>';
                }

                tr.innerHTML = `
                    <td class="font-medium">${user.name || 'N/A'}</td>
                    <td>${user.email}</td>
                    <td class="font-bold">${balanceFmt}</td>
                    <td>${roleBadge}</td>
                    <td>${statusBadge}</td>
                    <td>${actions}</td>
                `;
                tbody.appendChild(tr);
            });
        }, (error) => {
            console.error("Error loading users:", error);
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-red-400">Error loading users.</td></tr>';
        });
    } catch (err) {
        console.error("Error setting listener:", err);
    }
}

document.getElementById('refresh-users-btn').addEventListener('click', loadUsers);

window.setUserStatus = async (userId, newStatus) => {
    try {
        await updateDoc(doc(db, "users", userId), { status: newStatus });
        showToast(`User marked as ${newStatus}`);
        logActivity(`User ${newStatus}`, `Admin changed status for user ID ${userId} to ${newStatus}`);
    } catch (err) {
        showToast('Error updating status');
        console.error(err);
    }
};

window.deleteUser = async (userId) => {
    if (confirm("Are you SURE you want to delete this user document? (This cannot be undone!)")) {
        try {
            await deleteDoc(doc(db, "users", userId));
            showToast('User document deleted');
            logActivity('User Deleted', `Admin deleted user document with ID ${userId}`);
        } catch (err) {
            showToast('Error deleting user');
            console.error(err);
        }
    }
};

window.setUserRole = async (userId, newRole) => {
    if (confirm(`Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`)) {
        try {
            await updateDoc(doc(db, "users", userId), { role: newRole });
            showToast(`User is now an ${newRole}`);
            logActivity('Role Updated', `Admin changed role for user ID ${userId} to ${newRole}`);
        } catch (err) {
            showToast('Error updating role');
            console.error(err);
        }
    }
};

// ============================================
// 4️⃣ ADMIN REFUND (A5)
// ============================================
document.getElementById('refund-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('refund-email').value.trim().toLowerCase();
    const amount = parseFloat(document.getElementById('refund-amount').value);
    const reason = document.getElementById('refund-reason').value.trim();

    try {
        showToast('Processing refund...');
        // Find user
        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            showToast('❌ User with that email not found!');
            return;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        
        // Update balance
        const newBalance = (userData.balance || 0) + amount;
        const txArray = userData.transactions || [];
        
        const now = new Date();
        txArray.unshift({
            type: 'deposit',
            amount: amount,
            description: `Admin Refund: ${reason}`,
            date: now.toLocaleDateString(),
            time: now.toLocaleTimeString()
        });

        await updateDoc(doc(db, "users", userDoc.id), {
            balance: newBalance,
            transactions: txArray
        });

        showToast(`✅ Refund of ₦${amount} successfully applied to ${email}`);
        logActivity('Refund processed', `Admin refunded ₦${amount} to ${email}. Reason: ${reason}`);
        document.getElementById('refund-form').reset();
    } catch (err) {
        showToast('❌ Error processing refund');
        console.error(err);
    }
});

// ============================================
// 5️⃣ TRANSACTIONS MONITORING (A6)
// ============================================
let unsubTx = null;
function loadAllTransactions() {
    const tbody = document.getElementById('tx-table-body');
    if (!tbody.innerHTML.trim()) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-400">Loading transactions...</td></tr>';
    }
    
    if (unsubTx) unsubTx();
    
    try {
        unsubTx = onSnapshot(collection(db, "users"), (querySnapshot) => {
            let globalTx = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const txs = data.transactions || [];
                txs.forEach(tx => {
                    globalTx.push({
                        email: data.email,
                        ...tx,
                        _sortTime: new Date(`${tx.date} ${tx.time}`).getTime()
                    });
                });
            });

            // Sort by newest first
            globalTx.sort((a, b) => b._sortTime - a._sortTime);

            tbody.innerHTML = '';
            if (globalTx.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-400">No transactions found anywhere.</td></tr>';
                return;
            }

            globalTx.forEach(tx => {
                const tr = document.createElement('tr');
                const amtClass = tx.type === 'deposit' ? 'text-green-400' : 'text-red-400';
                const amtPrefix = tx.type === 'deposit' ? '+' : '-';
                
                tr.innerHTML = `
                    <td class="text-sm whitespace-nowrap">${tx.date} ${tx.time}</td>
                    <td class="font-medium">${tx.email}</td>
                    <td><span class="badge ${tx.type === 'deposit' ? 'badge-active' : 'badge-suspended'} uppercase tracking-wider">${tx.type}</span></td>
                    <td>${tx.description}</td>
                    <td class="font-bold ${amtClass}">${amtPrefix}₦${tx.amount.toLocaleString()}</td>
                    <td>
                        <button class="action-btn-sm bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 px-3 py-1 rounded w-full" onclick="window.reverseTransaction('${tx.email}', '${tx.type}', '${tx.description}', ${tx.amount})">Reverse</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }, (error) => {
            console.error("Error loading transactions:", error);
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-red-400">Error loading transactions.</td></tr>';
        });
    } catch (err) {
        console.error("Error listener setup:", err);
    }
}
document.getElementById('refresh-tx-btn').addEventListener('click', loadAllTransactions);

window.reverseTransaction = async (email, type, description, amount) => {
    if (!confirm('Are you SURE you want to auto-reverse this transaction? This will automatically update the balances of all involved users.')) return;
    
    showToast('Reversing transaction... ⏳');
    try {
        let senderEmail = null;
        let receiverEmail = null;
        let reversalType = '';

        if (type === 'transfer') {
            senderEmail = email;
            receiverEmail = description.replace('Transfer to ', '');
            reversalType = 'transfer_reversal';
        } else if (type === 'deposit' && description.includes('Transfer from')) {
            receiverEmail = email;
            senderEmail = description.replace('Transfer from ', ''); 
            reversalType = 'transfer_reversal';
        } else if (type === 'deposit') {
            receiverEmail = email;
            reversalType = 'deposit_reversal';
        } else if (type === 'withdraw') {
            senderEmail = email;
            reversalType = 'withdraw_reversal';
        }

        // Helper to perform the db update
        const adjustUserBalance = async (userEmail, amtChange, txRecord) => {
            const q = query(collection(db, "users"), where("email", "==", userEmail));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const docRef = snap.docs[0];
                const data = docRef.data();
                const newBalance = (data.balance || 0) + amtChange;
                const newTxs = data.transactions || [];
                newTxs.unshift(txRecord);
                await updateDoc(doc(db, "users", docRef.id), { balance: newBalance, transactions: newTxs });
            }
        };

        const now = new Date();
        const dStr = now.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
        const tStr = now.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });

        if (reversalType === 'transfer_reversal') {
            if (receiverEmail) {
               await adjustUserBalance(receiverEmail, -amount, {
                   type: 'withdraw', amount: amount, description: 'Reversed Transfer from ' + senderEmail, date: dStr, time: tStr
               });
            }
            if (senderEmail) {
               await adjustUserBalance(senderEmail, amount, {
                   type: 'deposit', amount: amount, description: 'Reversed Transfer to ' + receiverEmail, date: dStr, time: tStr
               });
            }
            logActivity('Reversed Transfer', `Reversed ₦${amount} transfer from ${senderEmail} to ${receiverEmail}`);
        } else if (reversalType === 'deposit_reversal') {
            await adjustUserBalance(receiverEmail, -amount, {
                type: 'withdraw', amount: amount, description: 'Admin Reversed Deposit', date: dStr, time: tStr
            });
            logActivity('Reversed Deposit', `Reversed ₦${amount} deposit from ${receiverEmail}`);
        } else if (reversalType === 'withdraw_reversal') {
            await adjustUserBalance(senderEmail, amount, {
                type: 'deposit', amount: amount, description: 'Admin Reversed Withdrawal', date: dStr, time: tStr
            });
            logActivity('Reversed Withdrawal', `Reversed ₦${amount} withdrawal for ${senderEmail}`);
        }

        showToast('✅ Transaction Reversed!');
    } catch (err) {
        console.error(err);
        showToast('❌ Failed to reverse transaction');
    }
};

// ============================================
// 6️⃣ ACTIVITY LOGGING SYSTEM (A7)
// ============================================
async function logActivity(action, details) {
    try {
        await addDoc(collection(db, "activity_logs"), {
            action_type: action,
            details: details,
            admin_email: currentAdmin ? currentAdmin.email : "System",
            timestamp: serverTimestamp()
        });
    } catch (err) {
        console.error("Failed to log activity:", err);
    }
}

let unsubLogs = null;
function loadActivityLogs() {
    const tbody = document.getElementById('logs-table-body');
    if (!tbody.innerHTML.trim()) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-400">Loading logs...</td></tr>';
    }
    
    if (unsubLogs) unsubLogs();
    
    try {
        const q = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"));
        unsubLogs = onSnapshot(q, (snapshot) => {
            tbody.innerHTML = '';
            if (snapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-400">No logs found.</td></tr>';
                return;
            }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            let dateStr = "Unknown time";
            if (data.timestamp) {
                const d = data.timestamp.toDate();
                dateStr = d.toLocaleString();
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="whitespace-nowrap">${dateStr}</td>
                <td>${data.admin_email || data.user_email || "System"}</td>
                <td class="font-bold text-blue-400">${data.action_type}</td>
                <td>${data.details}</td>
            `;
            tbody.appendChild(tr);
        });
        }, (error) => {
            console.error("Error loading logs:", error);
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-400">Error loading logs.</td></tr>';
        });
    } catch (err) {
        console.error("Error init logs:", err);
    }
}
document.getElementById('refresh-logs-btn').addEventListener('click', loadActivityLogs);

// ============================================
// 7️⃣ NOTIFICATIONS SYSTEM (A8)
// ============================================
document.getElementById('notif-target').addEventListener('change', (e) => {
    const emailGroup = document.getElementById('notif-email-group');
    if (e.target.value === 'specific') {
        emailGroup.classList.remove('hidden');
        document.getElementById('notif-email').required = true;
    } else {
        emailGroup.classList.add('hidden');
        document.getElementById('notif-email').required = false;
    }
});

document.getElementById('notification-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const targetType = document.getElementById('notif-target').value;
    const email = document.getElementById('notif-email').value.trim().toLowerCase();
    const title = document.getElementById('notif-title').value;
    const message = document.getElementById('notif-message').value;

    try {
        await addDoc(collection(db, "notifications"), {
            target: targetType === 'all' ? 'all' : email,
            title: title,
            message: message,
            timestamp: serverTimestamp(),
            read: false
        });
        
        showToast('✅ Notification sent successfully!');
        logActivity('Notification Sent', `Target: ${targetType === 'all' ? 'All' : email}. Title: ${title}`);
        document.getElementById('notification-form').reset();
        document.getElementById('notif-target').value = 'all';
        document.getElementById('notif-email-group').classList.add('hidden');
    } catch (err) {
        console.error("Error sending notification:", err);
        showToast('❌ Failed to send notification.');
    }
});

// ============================================
// 8️⃣ PROFILE UPDATE (A9)
// ============================================
document.getElementById('admin-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = document.getElementById('admin-profile-name').value;
    
    try {
        await updateDoc(doc(db, "users", currentAdmin.uid), {
            name: newName
        });
        adminNameEl.textContent = newName;
        currentAdmin.name = newName;
        showToast('✅ Profile updated successfully!');
        logActivity('Admin Profile Updated', `Changed name to ${newName}`);
    } catch (err) {
        showToast('❌ Error updating profile');
    }
});
