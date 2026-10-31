(() => {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover:hover) and (pointer:fine)").matches;

  /* загрузка: прелоадер не дольше ~1.2 с */
  const start = performance.now();
  const done = () => setTimeout(() => root.classList.add("is-loaded"), Math.max(0, 900 - (performance.now() - start)));
  if (document.readyState === "complete") done(); else addEventListener("load", done, { once: true });
  setTimeout(() => root.classList.add("is-loaded"), 2500);

  /* меню */
  const burger = document.querySelector(".burger");
  const setMenu = (open) => {
    root.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  };
  burger.addEventListener("click", () => setMenu(!root.classList.contains("menu-open")));
  document.querySelectorAll(".nav a").forEach(a => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });

  /* заголовки по словам */
  document.querySelectorAll("[data-split]").forEach(h => {
    const text = h.textContent.trim();
    h.setAttribute("aria-label", text);
    h.innerHTML = text.split(" ").map((w, i) => `<span class="wm" aria-hidden="true"><span class="wi" style="--w:${i}">${w}</span></span>`).join(" ");
  });

  /* появления */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -12% 0px", threshold: .12 });
  document.querySelectorAll("[data-split],[data-stagger]").forEach(el => io.observe(el));

  /* курсор в первом экране + магнитная кнопка */
  const hero = document.querySelector(".hero");
  if (fine && !reduce) {
    hero.addEventListener("pointermove", e => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", ((e.clientX - r.left) / r.width - .5).toFixed(3));
      hero.style.setProperty("--my", ((e.clientY - r.top) / r.height - .5).toFixed(3));
    });
    document.querySelectorAll(".magnet").forEach(b => {
      b.addEventListener("pointermove", e => {
        const r = b.getBoundingClientRect();
        b.style.translate = `${(e.clientX - r.left - r.width / 2) * .18}px ${(e.clientY - r.top - r.height / 2) * .3}px`;
      });
      b.addEventListener("pointerleave", () => { b.style.translate = ""; });
    });
  }

  /* одна открытая плитка */
  const tiles = document.querySelectorAll(".tile");
  tiles.forEach(t => t.addEventListener("toggle", () => {
    if (t.open) tiles.forEach(o => { if (o !== t) o.open = false; });
  }));

  /* конструктор: у каждого ногтя свой цвет и свои детали */
  const nails = [...document.querySelectorAll(".nail")];
  const swatches = [...document.querySelectorAll(".swatch")];
  const decos = [...document.querySelectorAll("[data-deco]")];
  const summary = document.querySelector(".summary__text");
  const layers = document.querySelector(".layers");
  const decoNames = { french: "френч", dots: "точки", gems: "стразы", cherry: "вишенка" };
  const fingers = ["большой", "указательный", "средний", "безымянный", "мизинец"];
  const nailState = nails.map(() => ({ shade: swatches[0], deco: new Set() }));
  const selected = () => nails.map((n, i) => n.classList.contains("is-sel") ? i : -1).filter(i => i > -1);

  const render = (animateIdx = []) => {
    nails.forEach((n, i) => {
      const st = nailState[i];
      n.style.setProperty("--shade", st.shade.style.getPropertyValue("--c"));
      n.setAttribute("aria-pressed", n.classList.contains("is-sel"));
      const box = n.querySelector(".nail__deco");
      box.innerHTML = "";
      st.deco.forEach(d => {
        const el = document.createElement("i");
        el.className = "d-" + d;
        if (!animateIdx.includes(i) || reduce) el.style.animation = "none"; else el.style.animationDelay = animateIdx.indexOf(i) * 60 + "ms";
        box.appendChild(el);
      });
    });
    const groups = new Map();
    nailState.forEach((st, i) => {
      const key = st.shade.dataset.name + (st.deco.size ? " + " + [...st.deco].map(d => decoNames[d]).join(", ") : "");
      groups.set(key, [...(groups.get(key) || []), fingers[i]]);
    });
    summary.textContent = groups.size === 1
      ? [...groups.keys()][0] + " на всех ногтях"
      : [...groups].map(([k, f]) => `${k}: ${f.join(", ")}`).join("; ");
    const sel = selected();
    const lead = sel.length ? nailState[sel[0]] : null;
    swatches.forEach(o => o.setAttribute("aria-checked", !!lead && o === lead.shade && sel.every(i => nailState[i].shade === o)));
    decos.forEach(b => b.setAttribute("aria-pressed", sel.length > 0 && sel.every(i => nailState[i].deco.has(b.dataset.deco))));
  };
  nails.forEach(n => n.addEventListener("click", () => { n.classList.toggle("is-sel"); render(); }));
  document.querySelectorAll("[data-pick]").forEach(b => b.addEventListener("click", () => {
    nails.forEach((n, i) => n.classList.toggle("is-sel", b.dataset.pick === "all" || i === 3));
    render();
  }));
  swatches.forEach(s => s.addEventListener("click", () => {
    const sel = selected();
    if (!sel.length) { summary.textContent = "Сначала нажмите на ногти, которые хотите покрасить"; return; }
    sel.forEach(i => { nailState[i].shade = s; });
    render();
  }));
  decos.forEach(b => b.addEventListener("click", () => {
    const sel = selected(), d = b.dataset.deco;
    if (!sel.length) { summary.textContent = "Сначала нажмите на ногти, которые хотите украсить"; return; }
    const on = !sel.every(i => nailState[i].deco.has(d));
    sel.forEach(i => on ? nailState[i].deco.add(d) : nailState[i].deco.delete(d));
    render(on ? sel : []);
    if (on && !reduce) {
      const p = document.createElement("span");
      p.className = "layer-pop"; p.textContent = "+ " + decoNames[d];
      layers.appendChild(p); setTimeout(() => p.remove(), 1500);
    }
  }));
  document.querySelector("[data-take]").addEventListener("click", () => {
    document.querySelector("[name=comment]").value = "Дизайн из конструктора: " + summary.textContent;
    if (nailState.some(st => st.deco.size)) document.querySelector("[name=service]").value = "Дизайн";
  });
  render();

  /* скетчбук: кнопки */
  const track = document.querySelector(".book__track");
  document.querySelectorAll("[data-dir]").forEach(b => b.addEventListener("click", () => {
    const page = track.querySelector(".page");
    track.scrollBy({ left: (page.offsetWidth + 16) * +b.dataset.dir, behavior: reduce ? "auto" : "smooth" });
  }));

  /* игра */
  const names = { rock: "Камень", scissors: "Ножницы", paper: "Бумага" };
  const beats = { rock: "scissors", scissors: "paper", paper: "rock" };
  const you = document.querySelector("[data-you]"), bot = document.querySelector("[data-bot]");
  const result = document.querySelector(".game__result");
  let tries = 0, won = false;
  document.querySelectorAll("[data-move]").forEach(b => b.addEventListener("click", () => {
    if (won) return;
    const m = b.dataset.move, keys = Object.keys(names), c = keys[Math.floor(Math.random() * 3)];
    [you, bot].forEach(s => { s.textContent = "…"; s.classList.remove("is-shake"); void s.offsetWidth; s.classList.add("is-shake"); });
    setTimeout(() => {
      you.textContent = names[m]; bot.textContent = names[c]; tries++;
      if (m === c) result.textContent = "Ничья. Ещё раз?";
      else if (beats[m] === c) {
        won = true;
        result.innerHTML = 'Вы выиграли! Промокод на −10% к первому визиту:<br><span class="promo">CHERRY10</span>';
        const f = document.querySelector("[name=comment]");
        if (!f.value.includes("CHERRY10")) f.value = (f.value ? f.value + "\n" : "") + "Промокод CHERRY10";
      } else result.textContent = tries >= 3 ? "Сегодня удача на нашей стороне. Но ногти всё равно стоит обновить" : "Мы выиграли этот раунд. Попробуйте ещё";
    }, reduce ? 0 : 700);
  }));


  /* фото дизайна: показываем превью, никуда не отправляем */
  const input = document.getElementById("photos"), drop = document.querySelector(".upload__drop"), list = document.querySelector(".upload__list");
  let photos = [];
  const showPhotos = (note = "") => {
    list.innerHTML = "";
    photos.forEach((f, i) => {
      const li = document.createElement("li"), img = document.createElement("img"), x = document.createElement("button");
      img.src = URL.createObjectURL(f); img.alt = "Фото дизайна " + (i + 1); img.onload = () => URL.revokeObjectURL(img.src);
      x.type = "button"; x.textContent = "×"; x.setAttribute("aria-label", "Удалить фото " + (i + 1));
      x.onclick = () => { photos.splice(i, 1); showPhotos(); };
      li.append(img, x); list.appendChild(li);
    });
    const old = document.querySelector(".upload__err"); if (old) old.remove();
    if (note) { const p = document.createElement("p"); p.className = "upload__err"; p.textContent = note; list.after(p); }
  };
  const addFiles = files => {
    const imgs = [...files].filter(f => f.type.startsWith("image/"));
    const big = imgs.filter(f => f.size > 10 * 1024 * 1024);
    photos = [...photos, ...imgs.filter(f => f.size <= 10 * 1024 * 1024)];
    let note = big.length ? "Фото больше 10 МБ не добавлено" : "";
    if (photos.length > 3) { photos = photos.slice(0, 3); note = "Можно добавить до трёх фото"; }
    showPhotos(note); input.value = "";
  };
  input.addEventListener("change", () => addFiles(input.files));
  ["dragenter", "dragover"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove("is-over"); }));
  drop.addEventListener("drop", e => addFiles(e.dataTransfer.files));

  /* форма-демо */
  const form = document.querySelector(".form"), msg = form.querySelector(".form__msg");
  form.addEventListener("submit", e => {
    e.preventDefault();
    msg.className = "form__msg";
    const f = form.elements;
    if (!f.namedItem("name").value.trim() || f.namedItem("phone").value.replace(/\D/g, "").length < 10) {
      msg.textContent = "Укажите имя и телефон, чтобы мы могли перезвонить"; msg.classList.add("is-err"); return;
    }
    if (!f.namedItem("agree").checked) { msg.textContent = "Отметьте согласие на обработку данных"; msg.classList.add("is-err"); return; }
    msg.textContent = "Это демо-версия сайта: заявка" + (photos.length ? " и фото" : "") + " никуда не отправлены."; msg.classList.add("is-ok");
  });
  const dlg = document.querySelector(".policy");
  document.querySelector("[data-policy]").addEventListener("click", () => dlg.showModal());
})();
