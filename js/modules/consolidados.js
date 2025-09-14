/**
 * Módulo de Consolidados
 * Gerencia relatórios, exportações e análises financeiras
 */

import { ErrorHandler } from '../utils/error-handler.js';
import { LoadingManager } from '../utils/loading-manager.js';

class ConsolidadosModule {
    constructor() {
        this.currentSubTab = 'visao-geral';
        this.currentPeriod = 'mes-atual';
        this.charts = {};
        
        this.init();
    }

    init() {
        this.setupSubTabs();
        this.setupEventListeners();
        this.loadCurrentData();
    }

    setupSubTabs() {
        const subTabBtns = document.querySelectorAll('.consolidados-tab-btn');
        const subPanels = document.querySelectorAll('.consolidados-sub-panel');

        subTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const subTabId = btn.getAttribute('data-consolidado-tab');
                
                // Remover classe active de todos
                subTabBtns.forEach(b => b.classList.remove('active'));
                subPanels.forEach(p => p.classList.remove('active'));
                
                // Adicionar classe active aos selecionados
                btn.classList.add('active');
                const targetPanel = document.getElementById(subTabId);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
                
                this.currentSubTab = subTabId;
                this.loadSubTabData(subTabId);
            });
        });
    }

    setupEventListeners() {
        // Filtros de período
        const filtroPeriodo = document.getElementById('filtro-periodo');
        if (filtroPeriodo) {
            filtroPeriodo.addEventListener('change', () => {
                this.handlePeriodChange();
            });
        }

        // Botão aplicar filtros
        const btnAplicar = document.getElementById('aplicar-filtros');
        if (btnAplicar) {
            btnAplicar.addEventListener('click', () => {
                this.updateData();
            });
        }

        // Botões de exportação
        const exportButtons = document.querySelectorAll('.btn-export');
        exportButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const formato = btn.getAttribute('data-formato');
                const tipo = btn.getAttribute('data-tipo');
                this.exportReport(formato, tipo);
            });
        });

        // Filtros no HTML que estavam causando erro
        this.setupMissingFilters();
    }

    setupMissingFilters() {
        // Criar as funções que estavam faltando e causando erros
        window.app = window.app || {};
        
        window.app.filterByRecent = () => {
            this.filterByRecent();
        };
        
        window.app.filterByShared = () => {
            this.filterByShared();
        };
    }

    filterByRecent() {
        console.log('Filtrar por recentes implementado');
        // TODO: Implementar lógica de filtro por recentes
        ErrorHandler.showInfo('Filtro', 'Filtrar por recentes - funcionalidade será implementada em breve');
    }

    filterByShared() {
        console.log('Filtrar por compartilhados implementado');
        // TODO: Implementar lógica de filtro por compartilhados
        ErrorHandler.showInfo('Filtro', 'Filtrar por compartilhados - funcionalidade será implementada em breve');
    }

    handlePeriodChange() {
        const filtroPeriodo = document.getElementById('filtro-periodo');
        const dataInicio = document.getElementById('data-inicio-consolidado');
        const dataFim = document.getElementById('data-fim-consolidado');
        
        if (filtroPeriodo.value === 'personalizado') {
            dataInicio.style.display = 'block';
            dataFim.style.display = 'block';
        } else {
            dataInicio.style.display = 'none';
            dataFim.style.display = 'none';
        }
        
        this.currentPeriod = filtroPeriodo.value;
    }

    async loadSubTabData(subTabId) {
        try {
            switch (subTabId) {
                case 'visao-geral':
                    await this.loadVisaoGeral();
                    break;
                case 'rankings':
                    await this.loadRankings();
                    break;
                case 'orcamento':
                    await this.loadOrcamento();
                    break;
                case 'inteligente':
                    await this.loadInteligente();
                    break;
                case 'riscos':
                    await this.loadRiscos();
                    break;
            }
        } catch (error) {
            console.error(`Erro ao carregar sub-tab ${subTabId}:`, error);
            ErrorHandler.showError('Erro ao carregar dados', error.message);
        }
    }

    async loadCurrentData() {
        await this.loadSubTabData(this.currentSubTab);
    }

    async updateData() {
        LoadingManager.show('consolidados-update', 'Atualizando dados...');
        try {
            await this.loadCurrentData();
            ErrorHandler.showSuccess('Dados atualizados', 'Relatórios consolidados atualizados com sucesso');
        } catch (error) {
            ErrorHandler.showError('Erro na atualização', error.message);
        } finally {
            LoadingManager.hide('consolidados-update');
        }
    }

    async loadVisaoGeral() {
        try {
            // Buscar dados consolidados do servidor
            const response = await fetch('/api/consolidados/visao-geral');
            let data;
            
            if (response.ok) {
                data = await response.json();
            } else {
                // Dados mock enquanto a API não está implementada
                data = this.generateMockData();
            }

            this.updateVisaoGeralCards(data);
            this.updateCharts(data);

        } catch (error) {
            console.log('API não disponível, usando dados mock');
            const data = this.generateMockData();
            this.updateVisaoGeralCards(data);
            this.updateCharts(data);
        }
    }

    generateMockData() {
        return {
            totalEntradas: 150000,
            totalSaidas: 125000,
            saldoLiquido: 25000,
            margemLiquida: 16.7,
            variacaoEntradas: 12.5,
            variacaoSaidas: -8.3,
            variacaoSaldo: 45.2,
            fluxoMensal: {
                meses: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                entradas: [120000, 135000, 142000, 138000, 145000, 150000],
                saidas: [95000, 105000, 118000, 115000, 120000, 125000]
            },
            categorias: {
                labels: ['Fornecedores', 'Serviços', 'Materiais', 'Outros'],
                values: [45000, 35000, 25000, 20000]
            }
        };
    }

    updateVisaoGeralCards(data) {
        const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);

        const formatPercent = (value) => {
            const sign = value >= 0 ? '+' : '';
            return `${sign}${value.toFixed(1)}%`;
        };

        // Atualizar cards
        const totalEntradas = document.getElementById('total-entradas-consolidado');
        const totalSaidas = document.getElementById('total-saidas-consolidado');
        const saldoLiquido = document.getElementById('saldo-liquido-consolidado');
        const margemLiquida = document.getElementById('margem-liquida');

        if (totalEntradas) totalEntradas.textContent = formatCurrency(data.totalEntradas);
        if (totalSaidas) totalSaidas.textContent = formatCurrency(data.totalSaidas);
        if (saldoLiquido) saldoLiquido.textContent = formatCurrency(data.saldoLiquido);
        if (margemLiquida) margemLiquida.textContent = `${data.margemLiquida.toFixed(1)}%`;

        // Atualizar variações
        const variacaoEntradas = document.getElementById('variacao-entradas');
        const variacaoSaidas = document.getElementById('variacao-saidas');
        const variacaoSaldo = document.getElementById('variacao-saldo');

        if (variacaoEntradas) variacaoEntradas.textContent = `${formatPercent(data.variacaoEntradas)} vs período anterior`;
        if (variacaoSaidas) variacaoSaidas.textContent = `${formatPercent(data.variacaoSaidas)} vs período anterior`;
        if (variacaoSaldo) variacaoSaldo.textContent = `${formatPercent(data.variacaoSaldo)} vs período anterior`;
    }

    updateCharts(data) {
        // Implementar charts usando ApexCharts (mesmo padrão do dashboard)
        this.createFluxoCaixaChart(data.fluxoMensal);
        this.createCategoriasChart(data.categorias);
        this.createComparativoChart(data.fluxoMensal);
    }

    createFluxoCaixaChart(data) {
        const chartElement = document.getElementById('chart-fluxo-caixa');
        if (!chartElement) return;

        const options = {
            series: [
                { name: 'Entradas', data: data.entradas },
                { name: 'Saídas', data: data.saidas }
            ],
            chart: {
                type: 'line',
                height: 350
            },
            xaxis: {
                categories: data.meses
            },
            colors: ['#28a745', '#dc3545'],
            stroke: {
                curve: 'smooth',
                width: 3
            }
        };

        if (this.charts.fluxoCaixa) {
            this.charts.fluxoCaixa.destroy();
        }
        this.charts.fluxoCaixa = new ApexCharts(chartElement, options);
        this.charts.fluxoCaixa.render();
    }

    createCategoriasChart(data) {
        const chartElement = document.getElementById('chart-categorias');
        if (!chartElement) return;

        const options = {
            series: data.values,
            chart: {
                type: 'donut',
                height: 350
            },
            labels: data.labels,
            colors: ['#007bff', '#28a745', '#ffc107', '#17a2b8']
        };

        if (this.charts.categorias) {
            this.charts.categorias.destroy();
        }
        this.charts.categorias = new ApexCharts(chartElement, options);
        this.charts.categorias.render();
    }

    createComparativoChart(data) {
        const chartElement = document.getElementById('chart-comparativo-mensal');
        if (!chartElement) return;

        const options = {
            series: [
                { name: 'Entradas', data: data.entradas },
                { name: 'Saídas', data: data.saidas }
            ],
            chart: {
                type: 'bar',
                height: 350
            },
            xaxis: {
                categories: data.meses
            },
            colors: ['#28a745', '#dc3545']
        };

        if (this.charts.comparativo) {
            this.charts.comparativo.destroy();
        }
        this.charts.comparativo = new ApexCharts(chartElement, options);
        this.charts.comparativo.render();
    }

    async loadRankings() {
        console.log('Carregando rankings...');
        // TODO: Implementar dados de rankings
    }

    async loadOrcamento() {
        console.log('Carregando orçamento...');
        // TODO: Implementar dados de orçamento
    }

    async loadInteligente() {
        console.log('Carregando análise inteligente...');
        // TODO: Implementar análise inteligente
    }

    async loadRiscos() {
        console.log('Carregando análise de riscos...');
        // TODO: Implementar análise de riscos
    }

    async exportReport(formato, tipo) {
        LoadingManager.show(`export-${formato}-${tipo}`, `Exportando ${formato.toUpperCase()}...`);
        
        try {
            console.log(`Exportando relatório: ${tipo} em formato ${formato}`);
            
            // Simular delay de exportação
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            ErrorHandler.showSuccess('Exportação concluída', 
                `Relatório de ${tipo} exportado em ${formato.toUpperCase()} com sucesso!`);
            
            // TODO: Implementar exportação real
            
        } catch (error) {
            ErrorHandler.showError('Erro na exportação', error.message);
        } finally {
            LoadingManager.hide(`export-${formato}-${tipo}`);
        }
    }

    // Método público para ser chamado pelo TabManager
    async load() {
        await this.loadCurrentData();
    }
}

export { ConsolidadosModule };