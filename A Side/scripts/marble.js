(function () {
  var dropPalette = [
    [123, 57, 113],
    [148, 31, 66],
    [210, 32, 42],
    [248, 128, 66],
    [255, 193, 150],
    [253, 227, 227],
  ];

  var circleDetail = 84;
  var MAX_PIXEL_DENSITY = 1;
  var OVERSCAN = 0.25;

  function Drop(p, x, y, r) {
    this.cx = x;
    this.cy = y;
    this.r = r;
    this.baseX = new Float64Array(circleDetail);
    this.baseY = new Float64Array(circleDetail);
    this.vertX = new Float64Array(circleDetail);
    this.vertY = new Float64Array(circleDetail);
    this.ambX = new Float64Array(circleDetail);
    this.ambY = new Float64Array(circleDetail);
    this.ptrX = new Float64Array(circleDetail);
    this.ptrY = new Float64Array(circleDetail);

    for (var i = 0; i < circleDetail; i++) {
      var angle = (i / circleDetail) * 6.283185307;
      this.baseX[i] = x + Math.cos(angle) * r;
      this.baseY[i] = y + Math.sin(angle) * r;
      this.vertX[i] = this.baseX[i];
      this.vertY[i] = this.baseY[i];
    }

    var c = p.random(dropPalette);
    this.colStr = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  }

  Drop.prototype.vTine = function (x, z, c, dir) {
    var u = 1 / Math.pow(2, 1 / c);
    var sign = dir === 0 ? 1 : -1;
    for (var i = 0; i < circleDetail; i++) {
      this.baseY[i] += sign * z * Math.pow(u, Math.abs(this.baseX[i] - x));
    }
  };

  Drop.prototype.hTine = function (y, z, c, dir) {
    var u = 1 / Math.pow(2, 1 / c);
    var sign = dir === 0 ? 1 : -1;
    for (var i = 0; i < circleDetail; i++) {
      this.baseX[i] += sign * z * Math.pow(u, Math.abs(this.baseY[i] - y));
    }
  };

  Drop.prototype.marble = function (other) {
    var ocx = other.cx, ocy = other.cy, or2 = other.r * other.r;
    for (var i = 0; i < circleDetail; i++) {
      var dx = this.baseX[i] - ocx;
      var dy = this.baseY[i] - ocy;
      var m2 = dx * dx + dy * dy;
      var root = Math.sqrt(1 + or2 / m2);
      this.baseX[i] = ocx + dx * root;
      this.baseY[i] = ocy + dy * root;
    }
  };

  Drop.prototype.applyVortices = function (vortices, canvasW, canvasH, strength) {
    var maxAmb = this.r * 0.5;
    var maxAmb2 = maxAmb * maxAmb;

    for (var i = 0; i < circleDetail; i++) {
      var bx = this.baseX[i], by = this.baseY[i];
      var ox = this.ambX[i], oy = this.ambY[i];

      for (var v = 0; v < vortices.length; v++) {
        var vo = vortices[v];
        var vx0 = vo.fx * canvasW;
        var vy0 = vo.fy * canvasH;
        var radius = vo.r * (canvasW > canvasH ? canvasW : canvasH);
        var px0 = bx + ox;
        var py0 = by + oy;
        var dx = px0 - vx0;
        var dy = py0 - vy0;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius && dist > 0.0001) {
          var falloff = 1 - dist / radius;
          var angle = vo.speed * vo.dir * falloff * strength * 0.05;
          var cosA = Math.cos(angle);
          var sinA = Math.sin(angle);
          ox = (vx0 + dx * cosA - dy * sinA) - bx;
          oy = (vy0 + dx * sinA + dy * cosA) - by;
        }
      }

      var mag2 = ox * ox + oy * oy;
      if (mag2 > maxAmb2) {
        var scale = maxAmb / Math.sqrt(mag2);
        ox *= scale;
        oy *= scale;
      }
      this.ambX[i] = ox;
      this.ambY[i] = oy;
    }
  };

  Drop.prototype.applyPointerFlow = function (px, py, speed, dir, radius, strength) {
    for (var i = 0; i < circleDetail; i++) {
      var curX = this.baseX[i] + this.ptrX[i];
      var curY = this.baseY[i] + this.ptrY[i];
      var dx = curX - px;
      var dy = curY - py;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius && dist > 0.0001) {
        var falloff = 1 - dist / radius;
        var angle = dir * speed * falloff * strength;
        var cosA = Math.cos(angle);
        var sinA = Math.sin(angle);
        this.ptrX[i] = (px + dx * cosA - dy * sinA) - this.baseX[i];
        this.ptrY[i] = (py + dx * sinA + dy * cosA) - this.baseY[i];
      }
    }
  };

  Drop.prototype.settle = function () {
    var maxPtr = this.r * 0.9;
    var maxPtr2 = maxPtr * maxPtr;
    for (var i = 0; i < circleDetail; i++) {
      var px = this.ptrX[i] * 0.94;
      var py = this.ptrY[i] * 0.94;

      var pm2 = px * px + py * py;
      if (pm2 > maxPtr2) {
        var s = maxPtr / Math.sqrt(pm2);
        px *= s;
        py *= s;
      }
      this.ptrX[i] = px;
      this.ptrY[i] = py;

      this.vertX[i] = this.baseX[i] + this.ambX[i] + px;
      this.vertY[i] = this.baseY[i] + this.ambY[i] + py;
    }
  };

  Drop.prototype.show = function (ctx) {
    ctx.fillStyle = this.colStr;
    ctx.beginPath();
    ctx.moveTo(this.vertX[0], this.vertY[0]);
    for (var i = 1; i < circleDetail; i++) {
      ctx.lineTo(this.vertX[i], this.vertY[i]);
    }
    ctx.closePath();
    ctx.fill();
  };

  function buildDrops(p, W, H) {
    var n = 7;
    var padW = W * OVERSCAN;
    var padH = H * OVERSCAN;
    var sp = W / n;
    var blobRadius = W / (3 * n);

    var centerPoints = [];
    for (var i = sp - padW; i < W + padW; i += sp) {
      for (var j = sp - padH; j < H + padH; j += sp) {
        centerPoints.push([i, j]);
      }
    }
    // Fisher-Yates shuffle
    for (var k = centerPoints.length - 1; k > 0; k--) {
      var ri = Math.floor(Math.random() * (k + 1));
      var tmp = centerPoints[k];
      centerPoints[k] = centerPoints[ri];
      centerPoints[ri] = tmp;
    }

    var drops = [];
    var layersPerPoint = 3;
    for (var ci = 0; ci < centerPoints.length; ci++) {
      for (var j = 0; j < layersPerPoint; j++) {
        var drop = new Drop(p, centerPoints[ci][0], centerPoints[ci][1], blobRadius);
        for (var di = 0; di < drops.length; di++) drops[di].marble(drop);
        drops.push(drop);
      }
    }

    var tinePasses = 8;
    for (var di = 0; di < drops.length; di++) {
      for (var k = 0; k < tinePasses; k++) {
        var frac = (k + 1) / (tinePasses + 1);
        var dir = k % 2;
        drops[di].vTine(W * frac, 95, 16, dir);
        drops[di].hTine(H * frac, 95, 16, 1 - dir);
      }
    }

    return drops;
  }

  var sketch = function (p) {
    var drops = [];
    var container;
    var hero;
    var sceneActive = false;
    var frameCount = 0;

    var px = -9999, py = -9999;
    var prevPx = -9999, prevPy = -9999;
    var hasPointer = false;

    var vortices = [
      { fx: 0.25, fy: 0.30, speed: 0.4, dir:  1, r: 0.5 },
      { fx: 0.75, fy: 0.70, speed: 0.35, dir: -1, r: 0.45 },
      { fx: 0.50, fy: 0.15, speed: 0.3, dir:  1, r: 0.4 },
      { fx: 0.60, fy: 0.85, speed: 0.25, dir: -1, r: 0.35 },
    ];

    function getSceneSize() {
      return {
        width: Math.max(1, container.clientWidth),
        height: Math.max(1, container.clientHeight),
      };
    }

    function startScene() {
      if (sceneActive || !container) return;
      var s = getSceneSize();
      p.resizeCanvas(s.width, s.height, true);
      drops = buildDrops(p, p.width, p.height);
      sceneActive = true;
      p.loop();
    }

    function stopScene() {
      if (!sceneActive) return;
      p.noLoop();
      drops = [];
      p.resizeCanvas(1, 1, true);
      sceneActive = false;
    }

    function updateSceneVisibility() {
      var heroIsCurrent = hero && window.scrollY < hero.offsetHeight;
      if (!document.hidden && heroIsCurrent) startScene();
      else stopScene();
    }

    p.setup = function () {
      container = document.getElementById('marble-canvas');
      hero = container.closest('.hero');
      p.pixelDensity(MAX_PIXEL_DENSITY);
      var s = getSceneSize();
      var cnv = p.createCanvas(s.width, s.height);
      cnv.parent('marble-canvas');
      p.frameRate(30);
      p.noStroke();
      p.background(247, 244, 236);
      p.noLoop();

      // Defer heavy drop computation so the page paints first
      requestAnimationFrame(function () {
        drops = buildDrops(p, p.width, p.height);
        sceneActive = true;
        p.loop();
      });

      container.addEventListener('pointermove', function (e) {
        var rect = container.getBoundingClientRect();
        var newX = e.clientX - rect.left;
        var newY = e.clientY - rect.top;
        if (!hasPointer) { prevPx = newX; prevPy = newY; }
        px = newX;
        py = newY;
        hasPointer = true;
        document.documentElement.style.setProperty('--pointer-x', (px / rect.width * 100) + '%');
        document.documentElement.style.setProperty('--pointer-y', (py / rect.height * 100) + '%');
      });
      container.addEventListener('pointerleave', function () { hasPointer = false; });

      var scrollTicking = false;
      window.addEventListener('scroll', function () {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(function () {
          updateSceneVisibility();
          scrollTicking = false;
        });
      }, { passive: true });
      document.addEventListener('visibilitychange', updateSceneVisibility);
      updateSceneVisibility();
    };

    p.draw = function () {
      p.background(247, 244, 236);
      var ctx = p.drawingContext;
      frameCount++;

      if (frameCount % 2 === 0) {
        for (var i = 0; i < drops.length; i++) {
          drops[i].applyVortices(vortices, p.width, p.height, 0.6);
        }
      }

      if (hasPointer) {
        var vx = px - prevPx;
        var vy = py - prevPy;
        if (vx > 40) vx = 40; else if (vx < -40) vx = -40;
        if (vy > 40) vy = 40; else if (vy < -40) vy = -40;
        prevPx = px;
        prevPy = py;

        var moveMag = Math.sqrt(vx * vx + vy * vy);
        var baseSpeed = 0.06;
        var moveBoost = moveMag * 0.004;
        if (moveBoost > 0.16) moveBoost = 0.16;
        var radius = (p.width > p.height ? p.width : p.height) * 0.25;
        var cullR = radius;

        for (var i = 0; i < drops.length; i++) {
          var d = drops[i];
          var dx = d.cx - px;
          var dy = d.cy - py;
          if (dx * dx + dy * dy < (cullR + d.r) * (cullR + d.r)) {
            d.applyPointerFlow(px, py, baseSpeed + moveBoost, 1, radius, 1);
          }
        }
      }

      for (var i = 0; i < drops.length; i++) {
        drops[i].settle();
        drops[i].show(ctx);
      }
    };

    p.windowResized = function () {
      if (!sceneActive) return;
      var s = getSceneSize();
      p.resizeCanvas(s.width, s.height, true);
      drops = buildDrops(p, p.width, p.height);
    };
  };

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var staticSketch = function (p) {
      var drops = [];
      var container;
      p.setup = function () {
        container = document.getElementById('marble-canvas');
        var cnv = p.createCanvas(container.clientWidth, container.clientHeight);
        cnv.parent('marble-canvas');
        p.pixelDensity(1);
        p.noStroke();
        drops = buildDrops(p, p.width, p.height);
        p.noLoop();
      };
      p.draw = function () {
        p.background(247, 244, 236);
        var ctx = p.drawingContext;
        for (var i = 0; i < drops.length; i++) drops[i].show(ctx);
      };
    };
    new p5(staticSketch);
  } else {
    new p5(sketch);
  }
})();
