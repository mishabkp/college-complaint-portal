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

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const complaintsRef = ref(db, 'complaints');

document.addEventListener('DOMContentLoaded', () => {
    let complaints = [];

    const complaintForm = document.getElementById('complaintForm');
    const tableBody = document.getElementById('complaintsTableBody');
    const anonymousToggle = document.getElementById('anonymousToggle');
    const userDetails = document.getElementById('userDetails');

    // --- SECTION NAVIGATION ---
    const navItems = document.querySelectorAll('.nav-item');
    const dashboardSection = document.getElementById('dashboardSection');
    const newComplaintSection = document.getElementById('newComplaintSection');
    const topSubmitBtn = document.getElementById('topSubmitBtn');

    function showSection(section) {
        dashboardSection.style.display = 'none';
        newComplaintSection.style.display = 'none';

        navItems.forEach(n => n.classList.remove('active'));

        if (section === 'new-complaint') {
            newComplaintSection.style.display = 'block';
            document.querySelector('[data-section="new-complaint"]').classList.add('active');
        } else {
            dashboardSection.style.display = 'block';
            document.querySelector('[data-section="dashboard"]').classList.add('active');
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            showSection(section);
        });
    });

    if (topSubmitBtn) {
        topSubmitBtn.addEventListener('click', () => showSection('new-complaint'));
    }

    // --- ANONYMOUS TOGGLE ---
    if (anonymousToggle) {
        anonymousToggle.addEventListener('change', () => {
            userDetails.style.display = anonymousToggle.checked ? 'none' : 'flex';
        });
    }

    // --- SEARCH ---
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderTable();
        });
    }

    // --- REALTIME SYNC ---
    onValue(complaintsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            complaints = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
            complaints.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        } else {
            complaints = [];
        }
        renderTable();
        updateStats();
    });

    // --- RENDER TABLE ---
    function renderTable() {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        let filtered = complaints;
        const query = searchInput ? searchInput.value.toLowerCase() : '';
        if (query) {
            filtered = complaints.filter(c =>
                (c.subject || '').toLowerCase().includes(query) ||
                (c.category || '').toLowerCase().includes(query) ||
                (c.user || '').toLowerCase().includes(query)
            );
        }

        if (filtered.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="padding: 2rem; text-align: center; color: var(--text-muted);">No complaints found.</td></tr>';
            return;
        }

        filtered.forEach(c => {
            const row = document.createElement('tr');
            const shortId = '#CMP-' + c.id.toString().slice(-4).toUpperCase();
            const statusLabel = getStatusLabel(c.status);
            const statusClass = getStatusClass(c.status);

            row.innerHTML = `
                <td><span class="complaint-id">${shortId}</span></td>
                <td>${c.category || 'General'}</td>
                <td>
                    <span class="complaint-subject-text">${c.subject}</span>
                    ${c.reply ? `<div class="admin-reply" style="margin-top: 6px; padding: 0.5rem 0.75rem; font-size: 0.75rem;"><i class="fas fa-reply fa-rotate-180" style="font-size: 0.65rem;"></i><div class="reply-content"><strong>System Response:</strong> ${c.reply}</div></div>` : ''}
                </td>
                <td style="white-space: nowrap;">${c.date || '—'}</td>
                <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td><button class="view-btn" onclick="viewDetail('${c.id}')" title="View Details"><i class="fas fa-eye"></i></button></td>
            `;
            tableBody.appendChild(row);
        });
    }

    function getStatusLabel(status) {
        switch (status) {
            case 'received': return 'PENDING';
            case 'review': return 'IN PROGRESS';
            case 'resolved': return 'RESOLVED';
            default: return status ? status.toUpperCase() : 'PENDING';
        }
    }

    function getStatusClass(status) {
        switch (status) {
            case 'received': return 'status-received';
            case 'review': return 'status-review';
            case 'resolved': return 'status-resolved';
            default: return 'status-received';
        }
    }

    // --- UPDATE STATS ---
    function updateStats() {
        const pending = complaints.filter(c => c.status === 'received').length;
        const inProgress = complaints.filter(c => c.status === 'review').length;
        const resolved = complaints.filter(c => c.status === 'resolved').length;
        const total = complaints.length || 1;

        const el = (id) => document.getElementById(id);

        if (el('pendingCount')) el('pendingCount').innerText = String(pending).padStart(2, '0');
        if (el('progressCount')) el('progressCount').innerText = String(inProgress).padStart(2, '0');
        if (el('resolvedCount')) el('resolvedCount').innerText = String(resolved).padStart(2, '0');

        if (el('pendingSub')) el('pendingSub').innerText = `${pending} active`;
        if (el('progressSub')) el('progressSub').innerText = inProgress > 0 ? 'Active' : 'None';
        if (el('resolvedSub')) el('resolvedSub').innerText = `+${resolved} resolved`;

        if (el('pendingBar')) el('pendingBar').style.width = (pending / total * 100) + '%';
        if (el('progressBar')) el('progressBar').style.width = (inProgress / total * 100) + '%';
        if (el('resolvedBar')) el('resolvedBar').style.width = (resolved / total * 100) + '%';
    }

    // --- VIEW DETAIL ---
    window.viewDetail = (id) => {
        const c = complaints.find(comp => comp.id === id);
        if (!c) return;

        document.getElementById('detailSubject').innerText = c.subject;
        document.getElementById('detailContent').innerHTML = `
            <div style="display: grid; gap: 1rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">Category</div>
                        <div style="font-weight: 600;">${c.category}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">Priority</div>
                        <div style="font-weight: 600; text-transform: capitalize;">${c.priority || 'Medium'}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">Status</div>
                        <span class="status-badge ${getStatusClass(c.status)}">${getStatusLabel(c.status)}</span>
                    </div>
                    <div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">Reported By</div>
                        <div style="font-weight: 600;">${c.user}</div>
                    </div>
                </div>
                <div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Description</div>
                    <div style="background: var(--bg-light); padding: 1rem; border-radius: 8px; font-size: 0.9rem; line-height: 1.6;">${c.description || 'No description provided.'}</div>
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
        `;
        document.getElementById('detailModal').style.display = 'flex';
    };

    window.closeDetail = () => {
        document.getElementById('detailModal').style.display = 'none';
    };

    // --- VOTING (via detail modal or future feature) ---
    window.handleVote = (id) => {
        const c = complaints.find(comp => comp.id === id);
        if (c) {
            const updates = {};
            updates[`/complaints/${id}/votes`] = (c.votes || 0) + 1;
            update(ref(db), updates);
        }
    };

    // --- FORM SUBMISSION ---
    if (complaintForm) {
        complaintForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = complaintForm.querySelector('button[type="submit"]');
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
                    showSection('dashboard');
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
