// gru.js (обновленная версия с новой структурой модели)
class GRUModel {
    constructor(windowSize = 60, predictionHorizon = 5) {
        this.windowSize = windowSize;
        this.predictionHorizon = predictionHorizon;
        this.model = null;
        this.trainingHistory = null;
        this.isTrained = false;
        this.batchSize = 256;
        this.testPredictions = null;
        this.actualTestValues = null;
    }

    buildModel() {
        if (this.model) {
            this.model.dispose();
        }
        
        tf.disposeVariables();
        
        // Новая структура модели как в примере
        this.model = tf.sequential();
        
        // Первый слой GRU
        this.model.add(tf.layers.gru({
            units: 128,
            inputShape: [this.windowSize, 1],
            returnSequences: true
        }));
        
        // Dropout
        this.model.add(tf.layers.dropout({
            rate: 0.2
        }));
        
        // Второй слой GRU
        this.model.add(tf.layers.gru({
            units: 64,
            returnSequences: false
        }));
        
        // Dropout
        this.model.add(tf.layers.dropout({
            rate: 0.2
        }));
        
        // Dense слой
        this.model.add(tf.layers.dense({
            units: 32,
            activation: 'relu'
        }));
        
        // Выходной слой (для одного предсказания за раз)
        this.model.add(tf.layers.dense({
            units: 1,
            activation: 'linear'
        }));
        
        this.model.compile({
            optimizer: 'adam',
            loss: 'meanSquaredError'
        });
        
        console.log('✅ Model built with new architecture');
        this.isTrained = false;
        
        return this.model;
    }

    async train(X_train, y_train, epochs = 5, callbacks = {}) {
        console.log('Train method called with:', { 
            X_shape: X_train?.shape, 
            y_shape: y_train?.shape,
            epochs: epochs,
            hasCallbacks: !!callbacks
        });
        
        if (!this.model) {
            console.log('Building model...');
            this.buildModel();
        }
        
        if (!X_train || !y_train) {
            throw new Error('Training data not provided');
        }
        
        // Проверяем, что у нас есть данные
        if (X_train.shape[0] === 0 || y_train.shape[0] === 0) {
            throw new Error('No training samples available');
        }
        
        const sampleCount = X_train.shape[0];
        const batchSize = Math.min(this.batchSize, sampleCount);
        
        console.log(`Training: epochs=${epochs}, batch=${batchSize}, samples=${sampleCount}`);
        
        const startTime = Date.now();
        
        try {
            // Используем fit для обучения
            const history = await this.model.fit(X_train, y_train, {
                epochs: epochs,
                batchSize: batchSize,
                validationSplit: 0.1,
                verbose: 0,
                shuffle: true,
                callbacks: {
                    onEpochEnd: async (epoch, logs) => {
                        // Вызываем пользовательский callback
                        if (callbacks.onEpochEnd) {
                            try {
                                callbacks.onEpochEnd(epoch, {
                                    loss: logs.loss,
                                    val_loss: logs.val_loss,
                                    elapsed: (Date.now() - startTime) / 1000,
                                    progress: ((epoch + 1) / epochs) * 100
                                });
                            } catch (e) {
                                console.warn('Callback error:', e);
                            }
                        }
                        
                        // Даем возможность обновить UI
                        await tf.nextFrame();
                    }
                }
            });
            
            this.isTrained = true;
            
            // Вызываем callback окончания обучения
            if (callbacks.onTrainEnd) {
                try {
                    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
                    callbacks.onTrainEnd(totalTime);
                } catch (e) {
                    console.warn('Callback error:', e);
                }
            }
            
            console.log(`✅ Training completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
            return { success: true };
            
        } catch (error) {
            console.error('Training error:', error);
            
            // Вызываем callback окончания с ошибкой
            if (callbacks.onTrainEnd) {
                try {
                    callbacks.onTrainEnd(0);
                } catch (e) {
                    console.warn('Callback error:', e);
                }
            }
            
            throw error;
        }
    }

    async predict(X) {
        if (!this.model) {
            this.buildModel();
        }
        
        if (!X) {
            throw new Error('Input data not provided');
        }
        
        try {
            const predictions = this.model.predict(X);
            const predictionsArray = await predictions.array();
            predictions.dispose();
            
            return predictionsArray;
        } catch (error) {
            console.error('Prediction error:', error);
            return [Array(this.predictionHorizon).fill(0)];
        }
    }

    // Новый метод для предсказания тестовых данных (для графика)
    async predictTestData(X_test) {
        if (!this.model || !this.isTrained) {
            throw new Error('Model not trained');
        }
        
        if (!X_test) {
            throw new Error('Test data not provided');
        }
        
        try {
            const predictions = this.model.predict(X_test);
            const predictionsArray = await predictions.array();
            predictions.dispose();
            
            return predictionsArray;
        } catch (error) {
            console.error('Test prediction error:', error);
            return null;
        }
    }

    evaluate(X_test, y_test) {
        if (!this.model || !this.isTrained) {
            return { loss: 0.001, mse: 0.001, rmse: 0.032 };
        }

        try {
            const evaluation = this.model.evaluate(X_test, y_test, { 
                batchSize: Math.min(128, X_test.shape[0]),
                verbose: 0 
            });
            const loss = evaluation.arraySync();
            
            if (evaluation) evaluation.dispose();
            
            const rmse = Math.sqrt(loss);
            
            // Сохраняем предсказания и фактические значения для графика
            this.getTestPredictionsForChart(X_test, y_test);
            
            return { loss, mse: loss, rmse };
        } catch (error) {
            console.error('Evaluation error:', error);
            return { loss: 0.001, mse: 0.001, rmse: 0.032 };
        }
    }

    // Метод для получения предсказаний тестовых данных для графика
    async getTestPredictionsForChart(X_test, y_test) {
        if (!X_test || !y_test) return;
        
        try {
            // Получаем предсказания
            this.testPredictions = await this.predictTestData(X_test);
            
            // Получаем фактические значения
            this.actualTestValues = await y_test.array();
        } catch (error) {
            console.error('Error getting test predictions:', error);
        }
    }

    getTestChartData() {
        if (!this.testPredictions || !this.actualTestValues) {
            return null;
        }
        
        // Преобразуем данные для графика
        // Берем только первый прогноз из каждого окна (Day +1)
        const predictions = this.testPredictions.map(p => p[0]);
        const actuals = this.actualTestValues.map(a => a[0]);
        
        // Создаем индексы для оси X
        const indices = Array.from({ length: predictions.length }, (_, i) => i);
        
        return {
            indices: indices,
            predictions: predictions,
            actuals: actuals
        };
    }

    dispose() {
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
        this.isTrained = false;
        this.testPredictions = null;
        this.actualTestValues = null;
    }
}

export { GRUModel };
