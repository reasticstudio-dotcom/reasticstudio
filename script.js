const photoContainer = document.getElementById('photoContainer');
const templateOverlay = document.getElementById('templateOverlay');
const editPanel = document.getElementById('editPanel');

let activeImg = null;
let isDragging = false;
let startX, startY, initX, initY;

// KONFIGURASI PRESISI 6 SLOT (Pas di tengah frame hati)
// Koordinat ini disesuaikan untuk template 1200x1800 agar simetris kiri-kanan & atas-bawah
const SLOT_CONFIGS = [
    { left: 160, top: 280, width: 380, height: 340 }, // Kiri Atas
    { left: 660, top: 280, width: 380, height: 340 }, // Kanan Atas
    { left: 160, top: 730, width: 380, height: 340 }, // Kiri Tengah
    { left: 660, top: 730, width: 380, height: 340 }, // Kanan Tengah
    { left: 160, top: 1180, width: 380, height: 340 }, // Kiri Bawah
    { left: 660, top: 1180, width: 380, height: 340 }  // Kanan Bawah
];

// SCAN TEMPLATE ENGINE
document.getElementById('magicScan').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
        photoContainer.innerHTML = '';
        templateOverlay.src = img.src;
        templateOverlay.style.display = 'block';
        
        // Generate slot foto berdasarkan preset presisi, bukan deteksi piksel yang tidak stabil
        generatePhotoSlots();
        URL.revokeObjectURL(url);
    };

    img.src = url;
});

function generatePhotoSlots() {
    SLOT_CONFIGS.forEach((config) => {
        createPhotoBox(config.left, config.top, config.width, config.height);
    });
}

function createPhotoBox(x, y, w, h) {
    const box = document.createElement('div');
    box.className = 'photo-box';
    
    box.style.cssText = `
        left: ${x}px; 
        top: ${y}px; 
        width: ${w}px; 
        height: ${h}px;
    `;
    
    box.onclick = (e) => {
        if (e.target.classList.contains('remove-photo-btn')) return;
        const img = box.querySelector('img');
        if (img) selectPhoto(img);
        else triggerImageUpload(box);
    };
    photoContainer.appendChild(box);
}

function triggerImageUpload(box) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            box.innerHTML = '';
            
            // Wrapper untuk centering gambar di dalam box
            const imgWrapper = document.createElement('div');
            imgWrapper.className = 'img-wrapper';

            const img = document.createElement('img');
            img.src = ev.target.result;

            // Default values untuk manipulasi foto
            img.dataset.scale = 1; 
            img.dataset.bright = 100; 
            img.dataset.contrast = 100; 
            img.dataset.sat = 100;      
            img.dataset.x = 0; 
            img.dataset.y = 0;

            imgWrapper.appendChild(img);
            box.appendChild(imgWrapper);
            
            const btn = document.createElement('button');
            btn.className = 'remove-photo-btn';
            btn.innerHTML = '×';
            btn.onclick = (ev) => {
                ev.stopPropagation();
                box.innerHTML = '';
                activeImg = null;
                editPanel.style.display = 'none';
            };
            box.appendChild(btn);
            
            // Tunggu image load untuk kalkulasi centering sempurna
            img.onload = () => {
                centerImageInBox(img, box);
                selectPhoto(img);
                applyStyles();
            };
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

// Fungsi agar foto otomatis tercrop tengah & memenuhi box (Object-fit Cover style)
function centerImageInBox(img, box) {
    const boxWidth = box.clientWidth;
    const boxHeight = box.clientHeight;
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    const boxRatio = boxWidth / boxHeight;
    const imgRatio = imgWidth / imgHeight;

    if (imgRatio > boxRatio) {
        img.style.height = '100%';
        img.style.width = 'auto';
    } else {
        img.style.width = '100%';
        img.style.height = 'auto';
    }
}

function selectPhoto(img) {
    activeImg = img;
    editPanel.style.display = 'block';
    ['Scale', 'Bright', 'Contrast', 'Sat'].forEach(p => {
        const val = img.dataset[p.toLowerCase()];
        document.getElementById(`img${p}`).value = val;
        document.getElementById(`val-${p.toLowerCase()}`).innerText = p === 'Scale' ? val : val + '%';
    });
    document.querySelectorAll('.photo-box').forEach(b => b.style.outline = 'none');
    img.closest('.photo-box').style.outline = `3px dashed var(--accent)`;
}

['imgScale', 'imgBright', 'imgContrast', 'imgSat'].forEach(id => {
    document.getElementById(id).addEventListener('input', (e) => {
        if (!activeImg) return;
        const val = e.target.value;
        const key = id.replace('img', '').toLowerCase();
        activeImg.dataset[key] = val;
        document.getElementById(`val-${key}`).innerText = key === 'scale' ? val : val + '%';
        applyStyles();
    });
});

function applyStyles() {
    if (!activeImg) return;
    const d = activeImg.dataset;
    activeImg.style.transform = `translate(${d.x}px, ${d.y}px) scale(${d.scale})`;
    activeImg.style.filter = `brightness(${d.bright}%) contrast(${d.contrast}%) saturate(${d.sat}%)`;
}

// DRAG SYSTEM
window.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('remove-photo-btn')) return;
    if (e.target.tagName === 'IMG' && e.target.closest('.photo-box')) {
        isDragging = true; 
        activeImg = e.target;
        startX = e.clientX; 
        startY = e.clientY;
        initX = parseFloat(activeImg.dataset.x) || 0; 
        initY = parseFloat(activeImg.dataset.y) || 0;
        selectPhoto(activeImg);
    }
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging || !activeImg) return;
    activeImg.dataset.x = initX + (e.clientX - startX);
    activeImg.dataset.y = initY + (e.clientY - startY);
    applyStyles();
});

window.addEventListener('mouseup', () => isDragging = false);

// PRINT ENGINE
document.getElementById('printBtn').onclick = () => {
    document.querySelectorAll('.photo-box').forEach(b => b.style.outline = 'none');
    setTimeout(() => { window.print(); }, 500);
};

// DOWNLOAD ENGINE
document.getElementById('downloadBtn').onclick = () => {
    const btn = document.getElementById('downloadBtn');
    btn.innerText = 'PROCESSING...';
    const xBtns = document.querySelectorAll('.remove-photo-btn');
    xBtns.forEach(b => b.style.display = 'none');
    document.querySelectorAll('.photo-box').forEach(b => b.style.outline = 'none');

    const captureArea = document.getElementById("captureArea");
    const ratio = templateOverlay.naturalWidth / captureArea.clientWidth;

    html2canvas(captureArea, {
        scale: ratio,
        useCORS: true,
        backgroundColor: null,
        imageTimeout: 0,
        logging: false
    }).then(canvas => {
        const link = document.createElement("a");
        link.download = `REASTIC_STUDIO_${Date.now()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();

        btn.innerText = "💾 SIMPAN HASIL HD";
        xBtns.forEach(b => b.style.display = "flex");
    });
};