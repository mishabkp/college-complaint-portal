// Firebase Configuration (Provided by User)
const firebaseConfig = {
    apiKey: "AIzaSyAYrLYN2Q9eZLNREG2dIwMHNJUU86lKioA",
    authDomain: "college-portal-8ab95.firebaseapp.com",
    projectId: "college-portal-8ab95",
    storageBucket: "college-portal-8ab95.firebasestorage.app",
    messagingSenderId: "258703761041",
    appId: "1:258703761041:web:9c3fb5f2c31d7296b92930",
    databaseURL: "https://college-portal-8ab95-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Import Firebase (Loading from CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const complaintsRef = ref(db, 'complaints');

document.addEventListener('DOMContentLoaded', () => {
    let complaints = [];

    const complaintForm = document.getElementById('complaintForm');
    const complaintsList = document.getElementById('complaintsList');
    const anonymousToggle = document.getElementById('anonymousToggle');
    const userDetails = document.getElementById('userDetails');

    // Toggle user details section
    if (anonymousToggle) {
        anonymousToggle.addEventListener('change', () => {
            userDetails.style.display = anonymousToggle.checked ? 'none' : 'flex';
        });
    }

    // Real-time Database Sync
    onValue(complaintsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            complaints = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
            // Sort by votes
            complaints.sort((a, b) => (b.votes || 0) - (a.votes || 0));
        } else {
            complaints = [];
        }
        renderComplaints();
    });

    function renderComplaints() {
        if (!complaintsList) return;
        complaintsList.innerHTML = '';

        if (complaints.length === 0) {
            complaintsList.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-muted);">No complaints yet. Be the first to report!</div>';
            return;
        }

        complaints.forEach(c => {
            const item = document.createElement('div');
            item.className = 'complaint-item';

            const statusClass = `status-${c.status}`;
            const statusLabel = c.status.charAt(0).toUpperCase() + c.status.slice(1);

            item.innerHTML = `
                <div class="vote-control">
                    <button class="vote-btn" onclick="handleVote('${c.id}')">
                        <i class="fas fa-chevron-up"></i>
                        <span>${c.votes || 0}</span>
                    </button>
                </div>
                <div class="complaint-info">
                    <h4>${c.subject}</h4>
                    <div class="complaint-meta">
                        <span><i class="far fa-user"></i> ${c.user}</span>
                        <span><i class="far fa-folder"></i> ${c.category}</span>
                        <span><i class="far fa-calendar"></i> ${c.date}</span>
                    </div>
                    ${c.reply ? `
                        <div class="admin-reply">
                            <i class="fas fa-reply fa-rotate-180"></i>
                            <div class="reply-content">
                                <strong>System Response:</strong> ${c.reply}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="status-badge ${statusClass}">${statusLabel}</div>
            `;
            complaintsList.appendChild(item);
        });
        updateStats();
    }

    function updateStats() {
        const totalElem = document.getElementById('totalComplaints');
        const resolvedElem = document.getElementById('resolvedComplaints');

        if (totalElem) totalElem.innerText = complaints.length;
        if (resolvedElem) {
            const resolvedCount = complaints.filter(c => c.status === 'resolved').length;
            const percentage = complaints.length > 0 ? Math.round((resolvedCount / complaints.length) * 100) : 0;
            resolvedElem.innerText = percentage + '%';
        }
    }

    // Handle Voting (Cloud Update)
    window.handleVote = (id) => {
        const c = complaints.find(comp => comp.id === id);
        if (c) {
            const updates = {};
            updates[`/complaints/${id}/votes`] = (c.votes || 0) + 1;
            update(ref(db), updates);
        }
    };

    // Form Submission (Cloud Save)
    if (complaintForm) {
        complaintForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = complaintForm.querySelector('button');
            const originalText = btn.innerText;

            const newC = {
                subject: document.getElementById('subject').value,
                category: document.getElementById('category').value,
                priority: document.getElementById('priority').value,
                description: document.getElementById('description').value,
                status: 'received',
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
                timestamp: Date.now(),
                anonymous: anonymousToggle.checked,
                votes: 0,
                user: anonymousToggle.checked ? "Anonymous" : (document.getElementById('studentName').value || "Guest")
            };

            try {
                btn.innerText = "Processing...";
                btn.disabled = true;

                await push(complaintsRef, newC);

                btn.innerText = "✓ Submitted!";
                btn.style.background = "#059669";

                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.style.background = "";
                    btn.disabled = false;
                    complaintForm.reset();
                    document.getElementById('tracking').scrollIntoView({ behavior: 'smooth' });
                }, 1500);
            } catch (error) {
                console.error("Firebase Error: ", error);
                btn.innerText = "Error! Try Again";
                btn.style.background = "#ef4444";
                btn.disabled = false;
                alert("Submission failed: " + error.message);
            }
        });
    }
});
