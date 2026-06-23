export function initNodeGraph(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let animationFrameId;

  // Configuration
  const numNodes = 50;
  const maxDistance = 150;
  const nodeRadius = 3;
  // Get theme color (Aigocy Primary Red) or default to red
  const getThemeColor = () => {
    const rootStyles = getComputedStyle(document.documentElement);
    return rootStyles.getPropertyValue('--brand-blue').trim() || '#E92E20';
  };

  let nodes = [];
  let mouse = { x: null, y: null, radius: 200 };

  class Node {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 1.5;
      this.vy = (Math.random() - 0.5) * 1.5;
      this.baseX = this.x;
      this.baseY = this.y;
    }

    update() {
      // Bounce off walls
      if (this.x > width || this.x < 0) this.vx = -this.vx;
      if (this.y > height || this.y < 0) this.vy = -this.vy;

      this.x += this.vx;
      this.y += this.vy;

      // Mouse interaction (repel)
      if (mouse.x != null && mouse.y != null) {
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < mouse.radius) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (mouse.radius - distance) / mouse.radius;
          const directionX = forceDirectionX * force * -2;
          const directionY = forceDirectionY * force * -2;
          this.x += directionX;
          this.y += directionY;
        }
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = getThemeColor();
      ctx.fill();
    }
  }

  function resize() {
    const parent = canvas.parentElement;
    width = parent.clientWidth;
    height = parent.clientHeight || 500;
    canvas.width = width;
    canvas.height = height;
    initNodes();
  }

  function initNodes() {
    nodes = [];
    for (let i = 0; i < numNodes; i++) {
      nodes.push(new Node());
    }
  }

  function drawConnections() {
    const themeColor = getThemeColor();
    
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        let dx = nodes[a].x - nodes[b].x;
        let dy = nodes[a].y - nodes[b].y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < maxDistance) {
          ctx.beginPath();
          ctx.strokeStyle = themeColor;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 1 - (distance / maxDistance);
          ctx.moveTo(nodes[a].x, nodes[a].y);
          ctx.lineTo(nodes[b].x, nodes[b].y);
          ctx.stroke();
          ctx.globalAlpha = 1.0; // Reset
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < nodes.length; i++) {
      nodes[i].update();
      nodes[i].draw();
    }
    drawConnections();

    animationFrameId = requestAnimationFrame(animate);
  }

  // Event Listeners
  window.addEventListener('resize', resize);
  
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  canvas.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
  });

  // Start
  resize();
  animate();

  // Return a cleanup function if needed
  return () => {
    window.removeEventListener('resize', resize);
    cancelAnimationFrame(animationFrameId);
  };
}
