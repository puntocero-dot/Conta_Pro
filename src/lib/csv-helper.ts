import Papa from 'papaparse';

export interface CSVMapping {
    [key: string]: string;
}

export function parseCSV<T>(file: File, mapping: CSVMapping): Promise<T[]> {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const data = results.data as any[];
                const mappedData = data.map(row => {
                    const mappedRow: any = {};
                    for (const [internalKey, csvKey] of Object.entries(mapping)) {
                        // Support case-insensitive matching and exact matching
                        const actualKey = Object.keys(row).find(
                            k => k.toLowerCase() === csvKey.toLowerCase()
                        );
                        if (actualKey) {
                            mappedRow[internalKey] = row[actualKey];
                        }
                    }
                    return mappedRow as T;
                });
                resolve(mappedData);
            },
            error: (error) => {
                reject(error);
            }
        });
    });
}

export const MAPPINGS = {
    EMPLOYEE: {
        employeeName: 'nombre',
        jobTitle: 'cargo',
        employeeNumber: 'numero',
        salary: 'salario',
        otrosIngresos: 'otros',
        dui: 'dui',
        afpName: 'afp'
    },
    CLIENT: {
        name: 'nombre',
        email: 'correo',
        phone: 'telefono',
        nit: 'nit',
        dui: 'dui',
        address: 'direccion',
        type: 'tipo',
        role: 'rol'
    },
    TRANSACTION: {
        type: 'tipo',
        amount: 'monto',
        description: 'descripcion',
        date: 'fecha',
        categoryId: 'categoria_id'
    }
};
