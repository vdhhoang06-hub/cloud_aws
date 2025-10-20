document.getElementById('sentimentForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    // Lấy các element
    const commentText = document.getElementById('commentInput').value;
    const loadingDiv = document.getElementById('loading');
    
    // Lấy các thẻ kết quả
    const summaryCard = document.getElementById('summary-card');
    const scoresCard = document.getElementById('scores-card');
    const phrasesCard = document.getElementById('phrases-card');
    const entitiesCard = document.getElementById('entities-card');
    const errorCard = document.getElementById('error-card');

    // Lấy các vùng nội dung
    const summaryContent = document.getElementById('summary-content');
    const sentimentScoresDiv = document.getElementById('sentiment-scores');
    const keyPhrasesDiv = document.getElementById('key-phrases');
    const entitiesDiv = document.getElementById('entities');
    const errorMessageDiv = document.getElementById('error-message');

    // Reset giao diện
    loadingDiv.style.display = 'block';
    summaryCard.style.display = 'none';
    scoresCard.style.display = 'none';
    phrasesCard.style.display = 'none';
    entitiesCard.style.display = 'none';
    errorCard.style.display = 'none';

    try {
        // Gọi API backend
        const response = await fetch('http://127.0.0.1:5000/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: commentText })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Lỗi không xác định');
        }

        // --- BẮT ĐẦU HIỂN THỊ KẾT QUẢ ---

        // 1. Hiển thị Thẻ Tổng quan (an toàn khi thiếu dữ liệu)
        const overall = data.overallSentiment || 'N/A';
        const lang = (data.language || '').toUpperCase();
        let summaryHtml = `
            <p><strong>Cảm xúc chính:</strong> ${overall}</p>
            <p><strong>Ngôn ngữ phát hiện:</strong> ${lang}</p>
        `;
        if (data.message) {
            summaryHtml += `<p class="note">${data.message}</p>`;
        }
        summaryContent.innerHTML = summaryHtml;
        summaryCard.className = 'result-card' + (data.overallSentiment ? ` ${data.overallSentiment}` : ''); // Đổi màu thẻ nếu có
        summaryCard.style.display = 'block';

        // 2. Hiển thị Thẻ Điểm Chi tiết (dạng thanh bar) - chỉ khi có dữ liệu
        const hasScores = data.sentimentScores && typeof data.sentimentScores === 'object';
        if (hasScores) {
            let scoresHtml = '';
            const colors = { Positive: '#28a745', Negative: '#dc3545', Neutral: '#6c757d', Mixed: '#ffc107' };
            for (const [key, value] of Object.entries(data.sentimentScores)) {
                const percentage = (value * 100).toFixed(2);
                scoresHtml += `
                    <div class="score-bar-container">
                        <span class="label">${key}</span>
                        <div class="score-bar-wrapper">
                            <div class="score-bar" style="width: ${percentage}%; background-color: ${colors[key]}">
                                ${percentage}%
                            </div>
                        </div>
                    </div>
                `;
            }
            sentimentScoresDiv.innerHTML = scoresHtml;
            scoresCard.style.display = 'block';
        } else {
            scoresCard.style.display = 'none';
        }

        // 3. Hiển thị Thẻ Cụm từ khóa
        if (Array.isArray(data.keyPhrases) && data.keyPhrases.length > 0) {
            keyPhrasesDiv.innerHTML = data.keyPhrases
                .map(phrase => `<span class="tag">${phrase}</span>`)
                .join('');
            phrasesCard.style.display = 'block';
        } else {
            phrasesCard.style.display = 'none';
        }

        // 4. Hiển thị Thẻ Thực thể
        if (Array.isArray(data.entities) && data.entities.length > 0) {
            entitiesDiv.innerHTML = data.entities
                .map(entity => `
                    <span class="entity">
                        ${entity.text}
                        <span class="type" style="border: 2px solid ${getEntityColor(entity.type)}">${entity.type}</span>
                    </span>
                `)
                .join('');
            entitiesCard.style.display = 'block';
        } else {
            entitiesCard.style.display = 'none';
        }

    } catch (error) {
        // Hiển thị lỗi
        errorMessageDiv.innerText = `Đã có lỗi xảy ra: ${error.message}`;
        errorCard.style.display = 'block';
    } finally {
        // Ẩn loading
        loadingDiv.style.display = 'none';
    }
});

// Hàm trợ giúp để lấy màu cho từng loại thực thể (cho đẹp)
function getEntityColor(type) {
    const colorMap = {
        'PERSON': '#007bff',
        'LOCATION': '#28a745',
        'ORGANIZATION': '#ff9900',
        'DATE': '#dc3545',
        'COMMERCIAL_ITEM': '#6f42c1',
        'EVENT': '#17a2b8',
        'QUANTITY': '#6c757d',
        'DEFAULT': '#343a40'
    };
    return colorMap[type] || colorMap['DEFAULT'];
}