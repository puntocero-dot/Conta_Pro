/**
 * Servicio para integración con Bitcoin (Ley Bitcoin El Salvador)
 */
export class BitcoinService {
    private static COINDESK_API = 'https://api.coindesk.com/v1/bpi/currentprice/BTC.json';

    /**
     * Obtiene el precio actual de Bitcoin en USD.
     */
    static async getCurrentPrice(): Promise<number> {
        try {
            const response = await fetch(this.COINDESK_API);
            const data = await response.json();
            return data.bpi.USD.rate_float;
        } catch (error) {
            console.error('Error fetching Bitcoin price:', error);
            // Fallback a un precio estático aproximado si falla la API
            return 60000;
        }
    }

    /**
     * Convierte una cantidad de USD a Satoshis.
     */
    static async usdToSatoshis(usdAmount: number): Promise<number> {
        const btcPrice = await this.getCurrentPrice();
        const btcAmount = usdAmount / btcPrice;
        return Math.round(btcAmount * 100_000_000); // 1 BTC = 100,000,000 Satoshis
    }

    /**
     * Registra la valoración NIIF de una tenencia en BTC.
     */
    static async calculateValuationDifference(initialUsdValue: number, currentBtcAmount: number): Promise<number> {
        const currentPrice = await this.getCurrentPrice();
        const currentUsdValue = currentBtcAmount * currentPrice;
        return currentUsdValue - initialUsdValue;
    }
}
