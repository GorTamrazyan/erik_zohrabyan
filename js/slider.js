document.addEventListener('DOMContentLoaded', function () {
    const sliders = document.querySelectorAll('.before-after-slider');

    sliders.forEach(slider => {
        const afterImg = slider.querySelector('.img-after');
        const handle = slider.querySelector('.slider-handle');
        let isDragging = false;

        function moveSlider(x) {
            const rect = slider.getBoundingClientRect();
            let position = ((x - rect.left) / rect.width) * 100;
            position = Math.max(0, Math.min(100, position));
            afterImg.style.clipPath = `inset(0 0 0 ${position}%)`;
            handle.style.left = position + '%';
        }

        slider.addEventListener('mousedown', (e) => {
            isDragging = true;
            moveSlider(e.clientX);
        });

        window.addEventListener('mousemove', (e) => {
            if (isDragging) moveSlider(e.clientX);
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });

        slider.addEventListener('touchstart', (e) => {
            isDragging = true;
            moveSlider(e.touches[0].clientX);
        }, { passive: true });

        slider.addEventListener('touchmove', (e) => {
            if (isDragging) moveSlider(e.touches[0].clientX);
        }, { passive: true });

        slider.addEventListener('touchend', () => {
            isDragging = false;
        });
    });
});
