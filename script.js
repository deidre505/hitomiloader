document.getElementById("open-button").addEventListener("click", async () => {
    const mangaNumber = document.getElementById("manga-number").value;
    const errorMessage = document.getElementById("error-message");

    if (!mangaNumber) {
        errorMessage.textContent = "번호를 입력해주세요.";
        setTimeout(() => {
            errorMessage.textContent = "";
        }, 2000);
        return;
    }

    const response = await fetch(`/open?number=${mangaNumber}`);
    const data = await response.json();

    if (data.success) {
        window.open(data.url, "_blank");
        errorMessage.textContent = "";
    } else {
        errorMessage.textContent = data.message;
        setTimeout(() => {
            errorMessage.textContent = "";
        }, 2000);
    }
});

async function fetchStats() {
    const periodSelect = document.getElementById('period-select');
    const topNumbersList = document.getElementById('top-numbers-list');
    const topTagsList = document.getElementById('top-tags-list');

    if (!periodSelect) {
        return;
    }

    const period = periodSelect.value;
    const response = await fetch(`/api/stats?period=${period}`);
    const data = await response.json();

    if (data.error) {
        console.error(data.error);
        topNumbersList.innerHTML = '<li>데이터를 불러오는 중 오류가 발생했습니다.</li>';
        topTagsList.innerHTML = '<li>데이터를 불러오는 중 오류가 발생했습니다.</li>';
        return;
    }

    topNumbersList.innerHTML = '';
    if (data.topNumbers && data.topNumbers.length > 0) {
        data.topNumbers.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.manga_number} (${item.count}회)`;
            topNumbersList.appendChild(li);
        });
    } else {
        topNumbersList.innerHTML = '<li>표시할 데이터가 없습니다.</li>';
    }

    topTagsList.innerHTML = '';
    if (data.topTags && data.topTags.length > 0) {
        data.topTags.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.name} (${item.count}회)`;
            topTagsList.appendChild(li);
        });
    } else {
        topTagsList.innerHTML = '<li>표시할 데이터가 없습니다.</li>';
    }
}

const periodSelect = document.getElementById('period-select');
if (periodSelect) {
    periodSelect.addEventListener('change', fetchStats);
}

if (document.getElementById('stats') && document.getElementById('stats').classList.contains('active')) {
    fetchStats();
}