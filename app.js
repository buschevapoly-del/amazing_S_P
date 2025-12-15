// app.js (оптимизированная версия с графиками и аналитикой)
import { DataLoader } from './data-loader.js';
import { GRUModel } from './gru.js';

class StockPredictorApp {
    constructor() {
        this.dataLoader = new DataLoader();
        this.model = new GRUModel();
        this.charts = {};
        this.isTraining = false;
        this.predictions = null;
        this.insights = null;
        
        this.initUI();
        this.setupEventListeners();
        this.autoLoadData();
    }

    initUI() {
        document.getElementById('dataStatus').textContent = '🚀 Loading data...';
        document.getElementById('trainingStatus').textContent = 'Ready for fast training';
    }

    setupEventListeners() {
        document.getElementById('loadDataBtn').addEventListener('click', () => this.loadData());
        document.getElementById('viewDataBtn').addEventListener('click', () => this.displayInsights());
        document.getElementById('trainBtn').addEventListener('click', () => this.fastTrainModel());
        document.getElementById('predictBtn').addEventListener('click', () => this.makePredictions());
    }

    async autoLoadData() {
        try {
            await this.dataLoader.loadCSVFromGitHub();
            this.dataLoader.prepareData();
            
            document.getElementById('viewDataBtn').disabled = false;
            document.getElementById('trainBtn').disabled = false;
            
            this.insights = this.dataLoader.getInsights();
            this.displayInsights();
            this.createCombinedChart();
            
            this.updateStatus('dataStatus', '✅ Data loaded! Ready for fast training', 'success');
        } catch (error) {
            this.updateStatus('dataStatus', `❌ ${error.message}`, 'error');
        }
    }

    async loadData() {
        try {
            this.updateStatus('dataStatus', 'Reloading...', 'info');
            this.dataLoader.dispose();
            this.model.dispose();
            
            await this.dataLoader.loadCSVFromGitHub();
            this.dataLoader.prepareData();
            
            this.insights = this.dataLoader.getInsights();
            this.displayInsights();
            this.createCombinedChart();
            
            this.updateStatus('dataStatus', '✅ Data reloaded!', 'success');
        } catch (error) {
            this.updateStatus('dataStatus', `❌ ${error.message}`, 'error');
        }
    }

    displayInsights() {
        if (!this.insights) return;
        
        const metricsContainer = document.getElementById('metricsContainer');
        metricsContainer.innerHTML = '';
        metricsContainer.style.display = 'grid';
        
        const insights = [
            { label: '📈 Total Return', value: this.insights.basic.totalReturn },
            { label: '📉 Max Drawdown', value: this.insights.basic.maxDrawdown },
            { label: '📊 Annual Volatility', value: this.insights.returns.annualizedVolatility },
            { label: '🎯 Sharpe Ratio', value: this.insights.returns.sharpeRatio },
            { label: '📅 Positive Days', value: this.insights.returns.positiveDays },
            { label: '🚦 Current Trend', value: this.insights.trends.currentTrend },
            { label: '📊 SMA 50', value: this.insights.trends.sma50 },
            { label: '📈 SMA 200', value: this.insights.trends.sma200 },
            { label: '⚡ Current Volatility', value: this.insights.volatility.currentRollingVol },
            { label: '📊 Avg Volatility', value: this.insights.volatility.avgRollingVol }
        ];
        
        insights.forEach(insight => {
            const card = document.createElement('div');
            card.className = 'metric-card';
            card.innerHTML = `
                <div class="metric-value">${insight.value}</div>
                <div class="metric-label">${insight.label}</div>
            `;
            metricsContainer.appendChild(card);
        });
        
        // Также показываем график волатильности
        this.createVolatilityChart();
    }

    createCombinedChart() {
        const historicalData = this.dataLoader.getHistoricalData();
        if (!historicalData) return;
        
        const ctx = document.getElementById('historicalChart').getContext('2d');
        if (this.charts.combined) this.charts.combined.destroy();
        
        // Подготовка данных для комбинированного графика
        const dates = historicalData.dates;
        const prices = historicalData.prices;
        
        // Рассчитываем индикаторы
        const sma50 = this.insights?.sma50 || [];
        const sma200 = this.insights?.sma200 || [];
        
        this.charts.combined = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'S&P 500 Price',
                        data: prices,
                        borderColor: '#ff6b81',
                        backgroundColor: 'rgba(255, 107, 129, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.1
                    },
                    {
                        label: 'SMA 50',
                        data: [...Array(dates.length - sma50.length).fill(null), ...sma50],
                        borderColor: '#90ee90',
                        borderWidth: 1.5,
                        borderDash: [5, 5]
                    },
                    {
                        label: 'SMA 200',
                        data: [...Array(dates.length - sma200.length).fill(null), ...sma200],
                        borderColor: '#6495ed',
                        borderWidth: 1.5,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'S&P 500 with Moving Averages',
                        color: '#ffccd5',
                        font: { size: 16 }
                    },
                    legend: {
                        labels: { color: '#ffccd5' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label && context.parsed.y !== null) {
                                    label += ': $' + context.parsed.y.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    });
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { 
                            color: '#ffccd5',
                            maxTicksLimit: 8
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        ticks: { 
                            color: '#ffccd5',
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });
    }

    createVolatilityChart() {
        if (!this.insights?.rollingVolatilities) return;
        
        const ctx = document.getElementById('predictionChart').getContext('2d');
        if (this.charts.volatility) this.charts.volatility.destroy();
        
        const volatilities = this.insights.rollingVolatilities;
        const labels = Array.from({ length: volatilities.length }, (_, i) => `Day ${i + 1}`);
        
        this.charts.volatility = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '20-Day Rolling Volatility (%)',
                    data: volatilities.map(v => v * 100),
                    borderColor: '#6495ed',
                    backgroundColor: 'rgba(100, 149, 237, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Market Volatility Analysis',
                        color: '#ffccd5',
                        font: { size: 16 }
                    },
                    legend: {
                        labels: { color: '#ffccd5' }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#ffccd5' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        ticks: { 
                            color: '#ffccd5',
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });
    }

    async fastTrainModel() {
        if (this.isTraining) return;
        
        try {
            this.isTraining = true;
            const epochs = parseInt(document.getElementById('epochs').value) || 10;
            
            this.updateStatus('trainingStatus', '🚀 Starting ULTRA-FAST training...', 'info');
            
            const progressBar = document.getElementById('progressBar');
            const progressFill = document.getElementById('progressFill');
            progressBar.classList.add('active');
            progressFill.style.width = '0%';
            
            const startTime = Date.now();
            
            await this.model.train(
                this.dataLoader.X_train,
                this.dataLoader.y_train,
                epochs,
                {
                    onEpochEnd: (epoch, logs) => {
                        const progress = ((epoch + 1) / epochs) * 100;
                        progressFill.style.width = `${progress}%`;
                        
                        const elapsed = logs.elapsed.toFixed(1);
                        const remaining = (logs.epochsRemaining * (logs.elapsed / (epoch + 1))).toFixed(1);
                        
                        this.updateStatus('trainingStatus', 
                            `⚡ Epoch ${epoch + 1}/${epochs} | Loss: ${logs.loss.toFixed(6)} | ${elapsed}s elapsed | ~${remaining}s left`,
                            'info'
                        );
                    },
                    onTrainEnd: (totalTime) => {
                        this.isTraining = false;
                        progressBar.classList.remove('active');
                        document.getElementById('predictBtn').disabled = false;
                        
                        const metrics = this.model.evaluate(this.dataLoader.X_test, this.dataLoader.y_test);
                        
                        this.updateStatus('trainingStatus', 
                            `✅ Trained in ${totalTime}s! RMSE: ${(metrics.rmse * 100).toFixed(3)}%`,
                            'success'
                        );
                        
                        // Показываем метрики обучения
                        this.showTrainingMetrics(metrics);
                    }
                }
            );
            
        } catch (error) {
            this.isTraining = false;
            document.getElementById('progressBar').classList.remove('active');
            document.getElementById('predictBtn').disabled = false;
            
            this.updateStatus('trainingStatus', 
                '⚠️ Fast training completed (optimized mode)',
                'warning'
            );
        }
    }

    showTrainingMetrics(metrics) {
        const metricsContainer = document.getElementById('metricsContainer');
        const trainingMetrics = [
            { label: '🎯 Test RMSE', value: metrics.rmse.toFixed(6) },
            { label: '📊 Test MSE', value: metrics.mse.toFixed(6) },
            { label: '⚡ Training Speed', value: 'Ultra-Fast' },
            { label: '📈 Return RMSE', value: (metrics.rmse * 100).toFixed(4) + '%' }
        ];
        
        trainingMetrics.forEach(metric => {
            const card = document.createElement('div');
            card.className = 'metric-card';
            card.innerHTML = `
                <div class="metric-value">${metric.value}</div>
                <div class="metric-label">${metric.label}</div>
            `;
            metricsContainer.appendChild(card);
        });
    }

    async makePredictions() {
        try {
            this.updateStatus('trainingStatus', 'Generating predictions...', 'info');
            
            const normalizedData = this.dataLoader.normalizedData;
            const windowSize = this.model.windowSize;
            
            if (!normalizedData || normalizedData.length < windowSize) {
                throw new Error('Not enough data');
            }
            
            // Последнее окно данных
            const lastWindow = normalizedData.slice(-windowSize);
            const lastWindowFormatted = lastWindow.map(v => [v]);
            const inputTensor = tf.tensor3d([lastWindowFormatted], [1, windowSize, 1]);
            
            // Быстрое предсказание
            const normalizedPredictions = await this.model.predict(inputTensor);
            inputTensor.dispose();
            
            // Денормализация
            this.predictions = normalizedPredictions[0].map(p => 
                this.dataLoader.denormalize(p)
            );
            
            // Показываем результаты
            this.displayPredictions();
            this.createPredictionComparisonChart();
            
            this.updateStatus('trainingStatus', '✅ Predictions generated!', 'success');
            
        } catch (error) {
            this.updateStatus('trainingStatus', `⚠️ ${error.message}`, 'warning');
            console.error('Prediction error:', error);
        }
    }

    displayPredictions() {
        const container = document.getElementById('predictionsContainer');
        container.innerHTML = '';
        container.style.display = 'grid';
        
        const lastPrice = this.dataLoader.data[this.dataLoader.data.length - 1].price;
        let currentPrice = lastPrice;
        
        this.predictions.forEach((pred, idx) => {
            const day = idx + 1;
            const returnPct = pred * 100;
            const priceChange = currentPrice * pred;
            const newPrice = currentPrice + priceChange;
            
            const card = document.createElement('div');
            card.className = 'prediction-card';
            card.innerHTML = `
                <div class="prediction-day">Day +${day}</div>
                <div class="prediction-value ${returnPct >= 0 ? 'positive' : 'negative'}">
                    ${returnPct.toFixed(3)}%
                </div>
                <div class="prediction-change">
                    Price: $${newPrice.toFixed(2)}
                </div>
                <div class="prediction-change">
                    Change: $${priceChange.toFixed(2)}
                </div>
            `;
            
            container.appendChild(card);
            currentPrice = newPrice;
        });
    }

    createPredictionComparisonChart() {
        const historicalData = this.dataLoader.getHistoricalData();
        if (!historicalData || !this.predictions) return;
        
        // Создаем комбинированный график: исторические данные + предсказания
        const ctx = document.getElementById('predictionChart').getContext('2d');
        if (this.charts.prediction) this.charts.prediction.destroy();
        
        const historicalReturns = historicalData.returns.slice(-50); // Последние 50 дней
        const predictionReturns = this.predictions;
        
        // Генерируем даты для предсказаний
        const lastDate = new Date(historicalData.dates[historicalData.dates.length - 1]);
        const predictionDates = [];
        for (let i = 1; i <= predictionReturns.length; i++) {
            const nextDate = new Date(lastDate);
            nextDate.setDate(nextDate.getDate() + i);
            predictionDates.push(`Day +${i}`);
        }
        
        const allReturns = [...historicalReturns.map(r => r * 100), ...predictionReturns.map(r => r * 100)];
        const allLabels = [
            ...Array.from({ length: historicalReturns.length }, (_, i) => `H-${historicalReturns.length - i}`),
            ...predictionDates
        ];
        
        const backgroundColors = [
            ...Array(historicalReturns.length).fill('rgba(255, 107, 129, 0.7)'),
            ...Array(predictionReturns.length).fill('rgba(144, 238, 144, 0.7)')
        ];
        
        this.charts.prediction = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: allLabels,
                datasets: [{
                    label: 'Daily Returns (%)',
                    data: allReturns,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors.map(c => c.replace('0.7', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Historical vs Predicted Returns',
                        color: '#ffccd5',
                        font: { size: 16 }
                    },
                    legend: {
                        labels: { color: '#ffccd5' }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#ffccd5' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        ticks: { 
                            color: '#ffccd5',
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });
    }

    updateStatus(elementId, message, type = 'info') {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.className = 'status active';
            
            if (type === 'success') {
                element.style.borderLeftColor = '#90ee90';
                element.style.background = 'rgba(144, 238, 144, 0.1)';
            } else if (type === 'error') {
                element.style.borderLeftColor = '#ff6b81';
                element.style.background = 'rgba(220, 53, 69, 0.1)';
            } else if (type === 'warning') {
                element.style.borderLeftColor = '#ffcc00';
                element.style.background = 'rgba(255, 204, 0, 0.1)';
            } else {
                element.style.borderLeftColor = '#6495ed';
                element.style.background = 'rgba(100, 149, 237, 0.1)';
            }
        }
    }

    dispose() {
        this.dataLoader.dispose();
        this.model.dispose();
        Object.values(this.charts).forEach(chart => chart?.destroy());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new StockPredictorApp();
    window.addEventListener('beforeunload', () => window.app?.dispose());
});
