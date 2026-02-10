// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAYrLYN2Q9eZLNREG2dIwMHNJUU86lKioA",
  authDomain: "college-portal-8ab95.firebaseapp.com",
  projectId: "college-portal-8ab95",
  storageBucket: "college-portal-8ab95.firebasestorage.app",
  messagingSenderId: "258703761041",
  appId: "1:258703761041:web:9c3fb5f2c31d7296b92930",
  databaseURL: "https://college-portal-8ab95-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const complaintsRef = ref(db, 'complaints');

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
});

function checkSession() {
    if (sessionStorage.getItem('admin_logged_in') === 'true') {
        showDashboard();
    }
}

window.handleLogin = () => {
    const pass = document.getElementById('adminPassword').value;
    if (pass === 'admin123') {
        sessionStorage.setItem('admin_logged_in', 'true');
        showDashboard();
    } else {
        alert('Invalid password! Access denied.');
    }
};

function showDashboard() {
    const loginSection = document.getElementById('adminLoginSection');
    const dashboardSection = document.getElementById('adminDashboard');
    const logoutBtn = document.getElementById('logoutBtn');

    if (loginSection) loginSection.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'block';
    
    // Real-time Cloud Sync
    onValue(complaintsRef, (snapshot) => {
        const data = snapshot.val();
        let complaints = [];
        if (data) {
            complaints = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
            complaints.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        }
        renderAdminTable(complaints);
    });
}

window.handleLogout = () => {
    sessionStorage.removeItem('admin_logged_in');
    location.reload();
};

function renderAdminTable(complaints) {
    const body = document.getElementById('adminTableBody');
    if (!body) return;
    
    body.innerHTML = '';

    if (complaints.length === 0) {
        body.innerHTML = '<tr><td colspan="6" style="padding: 2rem; text-align: center; color: var(--text-muted);">No complaints reported yet in the Cloud.</td></tr>';
        return;
    }

    complaints.forEach(c => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--border)';
        
        row.innerHTML = `
            <td style="padding: 1.25rem; font-weight: 600; color: var(--primary);">#${c.id.toString().slice(-4)}</td>
            <td style="padding: 1.25rem;">
                <div style="font-weight: 600;">${c.subject}</div>
                ${c.reply ? `<div style="font-size: 0.75rem; color: var(--primary); margin-top: 4px;"><i class="fas fa-reply"></i> ${c.reply}</div>` : ''}
            </td>
            <td style="padding: 1.25rem;">${c.user}</td>
            <td style="padding: 1.25rem;"><span style="font-size: 0.8rem; color: var(--text-muted)">${c.category}</span></td>
            <td style="padding: 1.25rem;">
                <span class="status-badge status-${c.status}">${c.status}</span>
            </td>
            <td style="padding: 1.25rem;">
                <div style="display: flex; gap: 0.5rem;">
                    ${c.status !== 'resolved' ? 
                        `<button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="markResolved('${c.id}')">Resolve</button>` : 
                        '<span style="color: var(--primary); font-weight: 700; font-size: 0.8rem;">✓ Fixed</span>'}
                    <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="openReplyModal('${c.id}')"><i class="fas fa-comment-dots"></i></button>
                    <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="deleteComplaint('${c.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        body.appendChild(row);
    });
}

// Reply Modal Logic
window.openReplyModal = (id) => {
    document.getElementById('currentReplyId').value = id;
    document.getElementById('replyText').value = '';
    document.getElementById('replyModal').style.display = 'flex';
};

window.closeReplyModal = () => {
    document.getElementById('replyModal').style.display = 'none';
};

window.submitReply = async () => {
    const id = document.getElementById('currentReplyId').value;
    const replyText = document.getElementById('replyText').value;

    if (!replyText.trim()) return alert("Please type a message first!");

    try {
        const updates = {};
        updates[`/complaints/${id}/reply`] = replyText;
        await update(ref(db), updates);
        closeReplyModal();
    } catch (e) {
        console.error(e);
        alert("Error sending reply: " + e.message);
    }
};

window.markResolved = async (id) => {
    try {
        const updates = {};
        updates[`/complaints/${id}/status`] = 'resolved';
        await update(ref(db), updates);
    } catch (e) {
        console.error(e);
        alert("Error marking resolved: " + e.message);
    }
};

window.deleteComplaint = async (id) => {
    if (confirm('Are you sure you want to delete this record from Cloud?')) {
        try {
            await remove(ref(db, `complaints/${id}`));
        } catch (e) {
            console.error(e);
            alert("Error deleting: " + e.message);
        }
    }
};
