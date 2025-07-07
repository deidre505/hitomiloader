
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mangaNumberFromUrl = urlParams.get('number');
    if (mangaNumberFromUrl) {
        document.getElementById('manga-number').value = mangaNumberFromUrl;
    }
});

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

async function fetchBookmarks() {
    const bookmarkList = document.getElementById('bookmark-list');
    bookmarkList.innerHTML = ''; // Clear existing bookmarks

    const extensionIdMeta = document.querySelector('meta[name="hitomi-addon-extension-id"]');
    if (!extensionIdMeta) {
        bookmarkList.innerHTML = '<li>Hitomi Addon extension not found.</li>';
        return;
    }
    const extensionId = extensionIdMeta.content;

    if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(extensionId, { action: "getReadLaterBookmarks" }, response => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(response);
                    }
                });
            });

            if (response && response.bookmarks && response.bookmarks.length > 0) {
                response.bookmarks.forEach(bookmark => {
                    const li = document.createElement('li');
                    li.textContent = bookmark;

                    const openButton = document.createElement('button');
                    openButton.textContent = '열기';
                    openButton.style.marginLeft = '10px';
                    openButton.addEventListener('click', async () => {
                        const response = await fetch(`/open?number=${bookmark}`);
                        const data = await response.json();
                        if (data.success) {
                            window.open(data.url, "_blank");
                        } else {
                            alert(data.message);
                        }
                    });

                    li.appendChild(openButton);
                    bookmarkList.appendChild(li);
                });
            } else {
                bookmarkList.innerHTML = '<li>저장된 북마크가 없습니다.</li>';
            }
        } catch (error) {
            console.error("Error fetching bookmarks from extension:", error);
            bookmarkList.innerHTML = '<li>북마크를 불러오는 데 실패했습니다. 확장 프로그램이 설치되어 있고 활성화되어 있는지 확인하세요.</li>';
        }
    } else {
        bookmarkList.innerHTML = '<li>Chrome 확장 프로그램 환경이 아닙니다.</li>';
    }
}

document.getElementById('refresh-bookmarks').addEventListener('click', fetchBookmarks);

