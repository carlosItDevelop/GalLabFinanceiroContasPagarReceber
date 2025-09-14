// Módulo do Dashboard
import { Formatters } from '../utils/formatters.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { LoadingManager } from '../utils/loading-manager.js';

export class Dashboard {
    constructor(api, themeManager) {
        this.api = api;
        this.themeManager = themeManager;
        this.charts = {};
    }

    async load() {
        this.loadingManager = new LoadingManager();
        
        try {
            // Mostrar loading nos cards
            this.showCardsLoading();
            
            const dashboardData = await ErrorHandler.withRetry(
                () => this.api.getDashboardData(),
                3,
                1000
            );
            
            this.updateCards(dashboardData);
            this.loadCharts(dashboardData);
            
            console.log('Dashboard carregado com dados:', dashboardData);
        } catch (error) {
            await ErrorHandler.handleApiError(error, 'dashboard');
            this.showErrorState();
        } finally {
            this.hideCardsLoading();
        }
    }

    updateCards(data) {
        const elements = {
            'total-pagar': Formatters.formatCurrency(data.totalPagar),
            'total-receber': Formatters.formatCurrency(data.totalReceber),
            'saldo-projetado': Formatters.formatCurrency(data.totalReceber - data.totalPagar),
            'vencidas-pagar': `${data.vencidasPagar} vencidas`,
            'vencidas-receber': `${data.vencidasReceber} vencidas`,
            'total-alertas': data.alertas
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    loadCharts(dashboardData) {
        this.loadFluxoCaixaChart(dashboardData.fluxoMensal);
        this.loadCategoriasChart(dashboardData.distribuicaoCategorias);
    }

    loadFluxoCaixaChart(fluxoData) {
        const { categorias, entradas, saidas } = fluxoData;
        
        // Calcular saldo líquido para cada mês
        const saldoLiquido = entradas.map((entrada, index) => entrada - saidas[index]);

        const fluxoOptions = {
            series: [{
                name: 'Entradas',
                type: 'column',
                data: entradas
            }, {
                name: 'Saídas',
                type: 'column',
                data: saidas
            }, {
                name: 'Saldo Líquido',
                type: 'line',
                data: saldoLiquido
            }],
            chart: {
                height: 400,
                background: 'transparent',
                toolbar: { 
                    show: true,
                    tools: {
                        download: true,
                        selection: false,
                        zoom: false,
                        zoomin: false,
                        zoomout: false,
                        pan: false,
                        reset: false
                    }
                },
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800,
                    animateGradually: {
                        enabled: true,
                        delay: 150
                    },
                    dynamicAnimation: {
                        enabled: true,
                        speed: 350
                    }
                }
            },
            colors: ['#28a745', '#dc3545', '#007bff'],
            plotOptions: {
                bar: {
                    columnWidth: '60%',
                    borderRadius: 4
                }
            },
            stroke: {
                width: [0, 0, 3],
                curve: 'smooth'
            },
            xaxis: {
                categories: categorias,
                labels: { 
                    style: { 
                        colors: 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: 500
                    }
                }
            },
            yaxis: {
                labels: { 
                    style: { 
                        colors: 'var(--text-secondary)',
                        fontSize: '11px'
                    },
                    formatter: (val) => Formatters.formatCurrency(val)
                }
            },
            legend: {
                labels: { 
                    colors: 'var(--text-primary)',
                    useSeriesColors: false
                },
                position: 'top',
                horizontalAlign: 'right',
                floating: true,
                offsetY: -25,
                offsetX: -5
            },
            grid: {
                borderColor: 'var(--border-color)',
                strokeDashArray: 3,
                opacity: 0.3
            },
            tooltip: {
                theme: this.themeManager.getCurrentTheme(),
                shared: true,
                intersect: false,
                y: {
                    formatter: (val) => Formatters.formatCurrency(val)
                }
            },
            dataLabels: {
                enabled: false
            },
            fill: {
                type: ['solid', 'solid', 'gradient'],
                gradient: {
                    shade: this.themeManager.getCurrentTheme(),
                    type: "vertical",
                    shadeIntensity: 0.3,
                    gradientToColors: undefined,
                    inverseColors: false,
                    opacityFrom: 0.8,
                    opacityTo: 0.1,
                    stops: [0, 100]
                }
            }
        };

        if (this.charts.fluxoDashboard) this.charts.fluxoDashboard.destroy();
        const chartElement = document.querySelector("#chart-fluxo-dashboard");
        if (chartElement) {
            this.charts.fluxoDashboard = new ApexCharts(chartElement, fluxoOptions);
            this.charts.fluxoDashboard.render();
        }

        console.log('Gráfico de fluxo carregado com dados:', fluxoData);
    }

    loadCategoriasChart(categoriaData) {
        const { labels, series, colors } = categoriaData;

        const categoriaOptions = {
            series: series,
            chart: {
                type: 'donut',
                height: 400,
                background: 'transparent',
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800,
                    animateGradually: {
                        enabled: true,
                        delay: 150
                    }
                }
            },
            colors: colors,
            labels: labels,
            plotOptions: {
                pie: {
                    donut: {
                        size: '60%',
                        labels: {
                            show: true,
                            name: {
                                show: true,
                                fontSize: '14px',
                                fontWeight: 600,
                                color: 'var(--text-primary)'
                            },
                            value: {
                                show: true,
                                fontSize: '16px',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                formatter: function(val) {
                                    return val + '%';
                                }
                            },
                            total: {
                                show: true,
                                label: 'Total',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: 'var(--text-secondary)',
                                formatter: function() {
                                    return '100%';
                                }
                            }
                        }
                    }
                }
            },
            legend: {
                position: 'bottom',
                labels: { 
                    colors: 'var(--text-primary)',
                    useSeriesColors: false
                }
            },
            tooltip: {
                theme: this.themeManager.getCurrentTheme(),
                y: {
                    formatter: function(val) {
                        return val + '%';
                    }
                }
            },
            dataLabels: {
                enabled: true,
                style: {
                    fontSize: '12px',
                    fontWeight: 'bold'
                },
                formatter: function(val) {
                    return Math.round(val) + '%';
                }
            }
        };

        if (this.charts.categoriasDashboard) this.charts.categoriasDashboard.destroy();
        const chartElement = document.querySelector("#chart-categorias-dashboard");
        if (chartElement) {
            this.charts.categoriasDashboard = new ApexCharts(chartElement, categoriaOptions);
            this.charts.categoriasDashboard.render();
        }

        console.log('Gráfico de categorias carregado com dados:', categoriaData);
    }

    showCardsLoading() {
        if (!this.loadingManager) this.loadingManager = new LoadingManager();
        
        ['total-pagar', 'total-receber', 'saldo-projetado'].forEach(cardId => {
            const card = document.getElementById(cardId);
            if (card) {
                this.loadingManager.showCard(cardId, '...');
            }
        });
    }
    
    hideCardsLoading() {
        if (!this.loadingManager) return;
        
        ['total-pagar', 'total-receber', 'saldo-projetado'].forEach(cardId => {
            this.loadingManager.hideCard(cardId);
        });
    }
    
    showErrorState() {
        const elements = {
            'total-pagar': 'Erro',
            'total-receber': 'Erro', 
            'saldo-projetado': 'Erro'
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                element.style.color = 'var(--danger-color)';
            }
        });
    }
}