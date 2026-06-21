// ▼ 1. インターフェース定義 ▼
interface ShiftData {
    dateObj: Date;
    jrHigh: number;    // 小中学生コマ
    highSchool: number; // 高校生コマ
    tutor: number;
    adjust: number;
}

interface RegularSetting {
    jrHigh: number;
    highSchool: number;
}

interface WageSettings {
    admin: number;
    jrHigh: number;
    highSchool: number;
    tutor: number;
    transport: number;
}

// ▼ 2. グローバルな状態管理 (State) ▼
let shiftData: ShiftData[] = [];
let regularSettings: RegularSetting[] = Array(7).fill(null).map(() => ({ jrHigh: 0, highSchool: 0 }));
let wageSettings: WageSettings = { admin: 1100, jrHigh: 1300, highSchool: 1460, tutor: 1200, transport: 0 };
let currentEditIndex: number = -1;
const weekdays: string[] = ['日', '月', '火', '水', '木', '金', '土'];

// ▼ 3. 初期化処理 ▼
window.onload = function (): void {
    setupDateSelectors();
    renderRegularSettings();
    initCalendar();
};

function setupDateSelectors(): void {
    const now: Date = new Date();
    const yearSelect = document.getElementById('select-year') as HTMLSelectElement | null;
    const monthSelect = document.getElementById('select-month') as HTMLSelectElement | null;
    if (!yearSelect || !monthSelect) return;

    for (let y = now.getFullYear(); y <= now.getFullYear() + 1; y++) {
        yearSelect.options.add(new Option(y.toString(), y.toString()));
    }
    for (let m = 1; m <= 12; m++) {
        monthSelect.options.add(new Option(m.toString(), m.toString()));
    }
    yearSelect.value = now.getFullYear().toString();
    monthSelect.value = (now.getMonth() + 1).toString();
}

function initCalendar(): void {
    const yearSelect = document.getElementById('select-year') as HTMLSelectElement | null;
    const monthSelect = document.getElementById('select-month') as HTMLSelectElement | null;
    if (!yearSelect || !monthSelect) return;

    const year: number = parseInt(yearSelect.value);
    const month: number = parseInt(monthSelect.value);

    const rangeLabel = document.getElementById('date-range-label');
    if (rangeLabel) {
        const nextMonth = month === 12 ? 1 : month + 1;
        rangeLabel.innerText = `${month}月16日 ～ ${nextMonth}月15日`;
    }

    shiftData = [];

    const prevMonthDate: Date = new Date(year, month - 1, 16);
    while (prevMonthDate.getDate() >= 16) {
        shiftData.push({ dateObj: new Date(prevMonthDate), jrHigh: 0, highSchool: 0, tutor: 0, adjust: 0 });
        prevMonthDate.setDate(prevMonthDate.getDate() + 1);
    }

    const currentMonthDate: Date = new Date(year, month, 1);
    while (currentMonthDate.getDate() <= 15) {
        shiftData.push({ dateObj: new Date(currentMonthDate), jrHigh: 0, highSchool: 0, tutor: 0, adjust: 0 });
        currentMonthDate.setDate(currentMonthDate.getDate() + 1);
    }

    renderCalendar();
    calculateAll();
}

(window as any).initCalendar = initCalendar;

// ▼ 4. 画面遷移 (サイドバー) ▼
(window as any).switchPage = function(target: 'shift' | 'regular' | 'wage'): void {
    const pages = ['shift', 'regular', 'wage'];
    pages.forEach(p => {
        document.getElementById(`page-${p}`)?.classList.remove('active');
    });
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => btn.classList.remove('active'));

    document.getElementById(`page-${target}`)?.classList.add('active');
    // 簡単のため、押されたボタンの特定には onclick 時の要素判定等を使用するのが一般的ですが、今回は簡易的にインデックスで付与
    if(target === 'shift') navBtns[0].classList.add('active');
    if(target === 'regular') navBtns[1].classList.add('active');
    if(target === 'wage') navBtns[2].classList.add('active');
};

(window as any).toggleSidebar = function(): void {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

// ▼ 5. カレンダー描画処理 ▼
function renderCalendar(): void {
    const calendarDiv = document.getElementById('calendar') as HTMLDivElement | null;
    if (!calendarDiv) return;
    calendarDiv.innerHTML = '';

    if (shiftData.length === 0) return;

    // 左端を必ず日曜日にするための空白マスを挿入
    const firstDayOfWeek = shiftData[0].dateObj.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell empty-cell';
        calendarDiv.appendChild(emptyCell);
    }

    shiftData.forEach((data, index) => {
        const cell: HTMLDivElement = document.createElement('div');
        cell.className = 'day-cell';

        const totalKoma = data.jrHigh + data.highSchool;
        const hasDetails: boolean = (data.tutor > 0 || data.adjust !== 0);
        const hasKoma: boolean = (totalKoma > 0);
        
        let bgColorClass: string = 'bg-empty';
        if (hasDetails) bgColorClass = 'bg-detail';
        else if (hasKoma) bgColorClass = 'bg-active';

        const dayNum: number = data.dateObj.getDate();

        cell.innerHTML = `
            <div class="half-up ${bgColorClass}" onclick="changeKoma(${index}, 1)">
                <div class="kebab-menu" onclick="event.stopPropagation(); openModal(${index})">⋮</div>
                <div class="date-label">${dayNum}日</div>
                <div class="koma-label">
                    小中: ${data.jrHigh}コマ<br>
                    高校: ${data.highSchool}コマ
                </div>
            </div>
            <div class="half-down" onclick="changeKoma(${index}, -1)">
                ▼ 減らす
            </div>
        `;
        calendarDiv.appendChild(cell);
    });
}

// カレンダー上でのコマ増減 (デフォルトは高校生を追加)
(window as any).changeKoma = function(index: number, amount: number): void {
    if (amount > 0) {
        shiftData[index].highSchool += 1;
    } else {
        // 減らす場合は、まず高校生から減らし、0なら小中学生を減らす
        if (shiftData[index].highSchool > 0) {
            shiftData[index].highSchool -= 1;
        } else if (shiftData[index].jrHigh > 0) {
            shiftData[index].jrHigh -= 1;
        }
    }
    renderCalendar();
    calculateAll();
};

// ▼ 6. 詳細設定モーダル ▼
(window as any).openModal = function(index: number): void {
    currentEditIndex = index;
    const dayNum: number = shiftData[index].dateObj.getDate();
    
    document.getElementById('modal-title')!.innerText = `${dayNum}日の詳細設定`;
    document.getElementById('modal-tutor-count')!.innerText = shiftData[index].tutor.toString();
    (document.getElementById('modal-adjust') as HTMLInputElement).value = shiftData[index].adjust.toString();
    document.getElementById('modal-hs-count')!.innerText = shiftData[index].highSchool.toString();

    document.getElementById('detail-modal')!.style.display = 'flex';
};

(window as any).closeModal = function(): void {
    document.getElementById('detail-modal')!.style.display = 'none';
    renderCalendar();
};

(window as any).changeModalTutor = function(amount: number): void {
    if (currentEditIndex === -1) return;
    let newTutor = shiftData[currentEditIndex].tutor + amount;
    if (newTutor < 0) newTutor = 0;
    shiftData[currentEditIndex].tutor = newTutor;
    document.getElementById('modal-tutor-count')!.innerText = newTutor.toString();
    calculateAll();
};

(window as any).changeModalAdjust = function(value: string): void {
    if (currentEditIndex === -1) return;
    shiftData[currentEditIndex].adjust = parseInt(value) || 0;
    calculateAll();
};

// 高校生コマの割合変更 (総コマ数は維持)
(window as any).changeModalHighSchool = function(amount: number): void {
    if (currentEditIndex === -1) return;
    const data = shiftData[currentEditIndex];
    const totalKoma = data.jrHigh + data.highSchool;
    
    if (totalKoma === 0) return; // コマが0の場合は割合変更不可

    let newHS = data.highSchool + amount;
    // 0以上、かつ総コマ数以下に制限
    if (newHS < 0) newHS = 0;
    if (newHS > totalKoma) newHS = totalKoma;

    data.highSchool = newHS;
    data.jrHigh = totalKoma - newHS;

    document.getElementById('modal-hs-count')!.innerText = data.highSchool.toString();
    calculateAll();
};

// ▼ 7. レギュラー授業設定 ▼
function renderRegularSettings(): void {
    const container = document.getElementById('regular-container') as HTMLDivElement | null;
    if (!container) return;
    container.innerHTML = '';
    
    const displayOrder: number[] = [1, 2, 3, 4, 5, 6, 0]; // 月〜日の順

    displayOrder.forEach(dayIndex => {
        const row = document.createElement('div');
        row.className = 'modal-row';
        row.style.borderBottom = '1px solid #eee';
        row.style.paddingBottom = '10px';
        
        row.innerHTML = `
            <div style="font-weight:bold; width: 50px;">${weekdays[dayIndex]}曜</div>
            <div>
                <div style="margin-bottom: 5px;">
                    小中: 
                    <button class="btn-circle" style="width:25px;height:25px;font-size:1em;" onclick="changeReg(${dayIndex}, 'jrHigh', -1)">-</button>
                    <span id="reg-jr-${dayIndex}" class="count-display" style="font-size:1em;">${regularSettings[dayIndex].jrHigh}</span>
                    <button class="btn-circle" style="width:25px;height:25px;font-size:1em;" onclick="changeReg(${dayIndex}, 'jrHigh', 1)">+</button>
                </div>
                <div>
                    高校: 
                    <button class="btn-circle" style="width:25px;height:25px;font-size:1em;" onclick="changeReg(${dayIndex}, 'hs', -1)">-</button>
                    <span id="reg-hs-${dayIndex}" class="count-display" style="font-size:1em;">${regularSettings[dayIndex].highSchool}</span>
                    <button class="btn-circle" style="width:25px;height:25px;font-size:1em;" onclick="changeReg(${dayIndex}, 'hs', 1)">+</button>
                </div>
            </div>
        `;
        container.appendChild(row);
    });
}

(window as any).changeReg = function(dayIndex: number, type: 'jrHigh' | 'hs', amount: number): void {
    if (type === 'jrHigh') {
        let val = regularSettings[dayIndex].jrHigh + amount;
        if (val < 0) val = 0;
        regularSettings[dayIndex].jrHigh = val;
        document.getElementById(`reg-jr-${dayIndex}`)!.innerText = val.toString();
    } else {
        let val = regularSettings[dayIndex].highSchool + amount;
        if (val < 0) val = 0;
        regularSettings[dayIndex].highSchool = val;
        document.getElementById(`reg-hs-${dayIndex}`)!.innerText = val.toString();
    }
};

(window as any).applyRegularShifts = function(): void {
    shiftData.forEach(data => {
        const dayOfWeek: number = data.dateObj.getDay();
        data.jrHigh = regularSettings[dayOfWeek].jrHigh;
        data.highSchool = regularSettings[dayOfWeek].highSchool;
    });
    renderCalendar();
    calculateAll();
    alert('レギュラー授業をカレンダーに反映しました！');
    (window as any).switchPage('shift');
};

// ▼ 8. 時給・計算ロジック ▼
(window as any).saveWageSettings = function(): void {
    wageSettings.admin = parseInt((document.getElementById('wage-admin') as HTMLInputElement).value) || 0;
    wageSettings.jrHigh = parseInt((document.getElementById('wage-jrhigh') as HTMLInputElement).value) || 0;
    wageSettings.highSchool = parseInt((document.getElementById('wage-high') as HTMLInputElement).value) || 0;
    wageSettings.tutor = parseInt((document.getElementById('wage-tutor') as HTMLInputElement).value) || 0;
    wageSettings.transport = parseInt((document.getElementById('wage-transport') as HTMLInputElement).value) || 0;
    alert('時給設定を保存しました。');
};

function calculateAll(): void {
    let grandTotalMinutes = 0;

    shiftData.forEach(data => {
        let k = data.jrHigh + data.highSchool;
        let t = data.tutor;
        let a = data.adjust;

        if (k > 0 || t > 0 || a !== 0) {
            let dailyTotal = 35; // 共通の事務時間
            if (k > 0) dailyTotal += (80 * k) + (10 * (k - 1));
            if (t > 0) dailyTotal += (50 * t) + (5 * (t - 1));
            dailyTotal += a;
            grandTotalMinutes += dailyTotal;
        }
    });

    const hours = Math.floor(grandTotalMinutes / 60);
    const mins = grandTotalMinutes % 60;

    document.getElementById('grand-total-hours')!.innerText = hours.toString();
    document.getElementById('grand-total-mins')!.innerText = mins.toString();

    const warningMsg = document.getElementById('warning-msg');
    if (warningMsg) {
        if (grandTotalMinutes > 4800) {
            warningMsg.style.display = 'block';
        } else {
            warningMsg.style.display = 'none';
        }
    }
}

(window as any).showExpectedIncome = function(): void {
    let totalIncome = 0;
    let workDays = 0;

    shiftData.forEach(data => {
        let k = data.jrHigh + data.highSchool;
        let t = data.tutor;
        let a = data.adjust;

        if (k > 0 || t > 0 || a !== 0) {
            workDays++;
            
            // 各項目の「分」を計算
            let adminMins = 35 + a;
            if (k > 0) adminMins += (10 * (k - 1));
            if (t > 0) adminMins += (5 * (t - 1));

            let jrHighMins = 80 * data.jrHigh;
            let highSchoolMins = 80 * data.highSchool;
            let tutorMins = 50 * data.tutor;

            // 時給(60分あたり)を用いて金額を計算
            totalIncome += (adminMins / 60) * wageSettings.admin;
            totalIncome += (jrHighMins / 60) * wageSettings.jrHigh;
            totalIncome += (highSchoolMins / 60) * wageSettings.highSchool;
            totalIncome += (tutorMins / 60) * wageSettings.tutor;
        }
    });

    totalIncome += workDays * wageSettings.transport;
    
    // 端数を切り捨てて表示
    alert(`当月の予想収入は 約 ${Math.floor(totalIncome).toLocaleString()} 円 です。\n(出勤日数: ${workDays}日)`);
};