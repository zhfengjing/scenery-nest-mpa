// API基础URL
const API_BASE_URL = '';
// const API_BASE_URL = 'http://localhost:8000';

// 全局状态
let currentEditingId = null;
let deleteUserId = null;

// DOM元素
const userForm = document.getElementById('user-form');
const userIdInput = document.getElementById('user-id');
const nicknameInput = document.getElementById('nickname');
const emailInput = document.getElementById('email');
const ageInput = document.getElementById('age');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const formTitle = document.getElementById('form-title');
const usersTbody = document.getElementById('users-tbody');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const tableWrapper = document.getElementById('table-wrapper');
const refreshBtn = document.getElementById('refresh-btn');
const deleteModal = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const modalClose = document.getElementById('modal-close');
const modalOverlay = document.getElementById('modal-overlay');
const deleteUserName = document.getElementById('delete-user-name');
const toast = document.getElementById('toast');

// 工具函数：显示Toast通知
function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 工具函数：格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 显示加载状态
function showLoading() {
    loading.style.display = 'block';
    errorMessage.style.display = 'none';
    tableWrapper.style.display = 'none';
    emptyState.style.display = 'none';
}

// 隐藏加载状态
function hideLoading() {
    loading.style.display = 'none';
}

// 显示错误信息
function showError(message) {
    hideLoading();
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    tableWrapper.style.display = 'none';
    emptyState.style.display = 'none';
}

// 显示空状态
function showEmptyState() {
    hideLoading();
    errorMessage.style.display = 'none';
    tableWrapper.style.display = 'none';
    emptyState.style.display = 'block';
}

// 显示表格
function showTable() {
    hideLoading();
    errorMessage.style.display = 'none';
    tableWrapper.style.display = 'block';
    emptyState.style.display = 'none';
}

// 获取所有用户
async function fetchUsers() {
    showLoading();

    try {
        const response = await fetch(`${API_BASE_URL}/user/list`);
        console.log('respones=', response);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const users = await response.json();
        renderUsers(users);
    } catch (error) {
        console.error('获取用户列表失败:', error);
        showError('获取用户列表失败，请检查服务器连接');
    }
}

// 渲染用户列表
function renderUsers(users) {
    if (users.length === 0) {
        showEmptyState();
        return;
    }

    showTable();
    usersTbody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${escapeHtml(user.nickname)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>${user.age ? escapeHtml(user.age) : '-'}</td>
            <td>${formatDate(user.createdAt)}</td>
            <td>${formatDate(user.updatedAt)}</td>
            <td class="text-center">
                <div class="table-actions">
                    <button class="btn btn-sm btn-primary" onclick="editUser(${user.id})">
                        编辑
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="showDeleteConfirm(${user.id}, '${escapeHtml(user.nickname)}')">
                        删除
                    </button>
                </div>
            </td>
        `;
        usersTbody.appendChild(row);
    });
}

// 转义HTML以防XSS攻击
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 创建用户
async function createUser(userData) {
    try {
        const response = await fetch(`${API_BASE_URL}/user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '创建用户失败');
        }

        const user = await response.json();
        showToast('用户创建成功！', 'success');
        userForm.reset();
        fetchUsers();
    } catch (error) {
        console.error('创建用户失败:', error);
        showToast(error.message || '创建用户失败', 'error');
    }
}

// 更新用户
async function updateUser(id, userData) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '更新用户失败');
        }

        const user = await response.json();
        showToast('用户更新成功！', 'success');
        cancelEdit();
        fetchUsers();
    } catch (error) {
        console.error('更新用户失败:', error);
        showToast(error.message || '更新用户失败', 'error');
    }
}

// 删除用户
async function deleteUser(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '删除用户失败');
        }

        showToast('用户删除成功！', 'success');
        closeDeleteModal();
        fetchUsers();
    } catch (error) {
        console.error('删除用户失败:', error);
        showToast(error.message || '删除用户失败', 'error');
        closeDeleteModal();
    }
}

// 获取单个用户信息用于编辑
async function editUser(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/${id}`);

        if (!response.ok) {
            throw new Error('获取用户信息失败');
        }

        const user = await response.json();

        // 填充表单
        userIdInput.value = user.id;
        nicknameInput.value = user.nickname;
        emailInput.value = user.email;
        ageInput.value = user.age || '';

        // 更新UI
        currentEditingId = id;
        formTitle.textContent = '编辑用户';
        submitBtn.querySelector('.btn-text').textContent = '更新用户';
        submitBtn.className = 'btn btn-success';
        cancelBtn.style.display = 'inline-flex';

        // 滚动到表单
        userForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        console.error('编辑用户失败:', error);
        showToast('获取用户信息失败', 'error');
    }
}

// 取消编辑
function cancelEdit() {
    currentEditingId = null;
    userForm.reset();
    userIdInput.value = '';
    formTitle.textContent = '添加新用户';
    submitBtn.querySelector('.btn-text').textContent = '添加用户';
    // submitBtn.querySelector('.btn-icon').textContent = '+';
    submitBtn.className = 'btn btn-primary';
    cancelBtn.style.display = 'none';
}

// 显示删除确认对话框
function showDeleteConfirm(id, name) {
    deleteUserId = id;
    deleteUserName.textContent = name;
    deleteModal.style.display = 'block';
}

// 关闭删除确认对话框
function closeDeleteModal() {
    deleteUserId = null;
    deleteModal.style.display = 'none';
}

// 表单提交事件
userForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userData = {
        nickname: nicknameInput.value.trim(),
        email: emailInput.value.trim(),
    };

    // 如果年龄字段有值，则添加到 userData
    if (ageInput.value.trim()) {
        userData.age = ageInput.value.trim();
    }

    // 禁用提交按钮防止重复提交
    submitBtn.disabled = true;

    if (currentEditingId) {
        await updateUser(currentEditingId, userData);
    } else {
        await createUser(userData);
    }

    submitBtn.disabled = false;
});

// 取消编辑按钮事件
cancelBtn.addEventListener('click', cancelEdit);

// 刷新按钮事件
refreshBtn.addEventListener('click', fetchUsers);

// 确认删除按钮事件
confirmDeleteBtn.addEventListener('click', () => {
    if (deleteUserId) {
        deleteUser(deleteUserId);
    }
});

// 取消删除按钮事件
cancelDeleteBtn.addEventListener('click', closeDeleteModal);

// 模态框关闭按钮事件
modalClose.addEventListener('click', closeDeleteModal);

// 点击遮罩层关闭模态框
modalOverlay.addEventListener('click', closeDeleteModal);

// 页面加载时获取用户列表
document.addEventListener('DOMContentLoaded', () => {
    fetchUsers();
});

// 暴露函数到全局作用域供HTML onclick使用
window.editUser = editUser;
window.showDeleteConfirm = showDeleteConfirm;
