import { initTheme } from './theme.js';
import { mountLayout, mountFooter } from './shared/layout.js';

export function initApp(activePage) {
  mountLayout(activePage);
  initTheme();
  mountFooter();
}

export function formatLevel(level) {
  return { BEGINNER: 'Beginner', INTERMEDIATE: 'Intermediate', ADVANCED: 'Advanced' }[level] || level;
}

export function formatAvailability(status) {
  return { AVAILABLE: 'Available', BUSY: 'Busy', UNAVAILABLE: 'Unavailable' }[status] || status;
}

export function availabilityClass(status) {
  return { AVAILABLE: 'badge--success', BUSY: 'badge--warning', UNAVAILABLE: 'badge--muted' }[status] || '';
}

export function starsHtml(rating, max = 5) {
  return Array.from({ length: max }, (_, i) =>
    `<svg class="star ${i < Math.round(rating) ? 'star--filled' : ''}" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`
  ).join('');
}

export function avatarHtml(user, size = 40) {
  const initials = (user?.name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2);
  if (user?.avatarUrl) {
    return `<img src="${user.avatarUrl}" alt="" class="avatar" width="${size}" height="${size}" />`;
  }
  return `<span class="avatar avatar--initials" style="width:${size}px;height:${size}px" aria-hidden="true">${initials}</span>`;
}

export function skillCardHtml(skill) {
  return `
    <article class="skill-card glass-card">
      <a href="/skill-detail.html?id=${skill.id}" class="skill-card__link">
        <div class="skill-card__cover">${skill.coverImageUrl ? `<img src="${skill.coverImageUrl}" alt="" />` : `<div class="skill-card__placeholder">${skill.category?.icon || '📚'}</div>`}</div>
        <div class="skill-card__body">
          <div class="skill-card__meta">
            <span class="badge">${formatLevel(skill.level)}</span>
            <span class="badge ${availabilityClass(skill.availability)}">${formatAvailability(skill.availability)}</span>
          </div>
          <h3 class="skill-card__title">${skill.title}</h3>
          <p class="skill-card__desc">${skill.shortDescription}</p>
          <div class="skill-card__provider">
            ${avatarHtml(skill.provider, 28)}
            <span>${skill.provider?.name}</span>
          </div>
          <div class="skill-card__footer">
            <span class="skill-card__category">${skill.category?.name}</span>
            ${skill.avgRating > 0 ? `<span class="skill-card__rating">${starsHtml(skill.avgRating)} ${skill.avgRating.toFixed(1)}</span>` : ''}
          </div>
        </div>
      </a>
    </article>`;
}

export function showToast(message, type = 'info') {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast toast--${type} toast--visible`;
  setTimeout(() => toast.classList.remove('toast--visible'), 3500);
}

export function showError(el, message) {
  if (el) {
    el.textContent = message;
    el.hidden = false;
  }
}
