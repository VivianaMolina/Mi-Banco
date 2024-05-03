const { Pool } = require("pg");
const Cursor = require("pg-cursor")

const argumentos = process.argv.slice(2);
const evento = String(argumentos[0]);
const descripcion = String(argumentos[1]);
const fecha = String(argumentos[2]);
const monto = Number(argumentos[3]);
const cuenta_origen = Number(argumentos[4]);
const cuenta_destino = Number(argumentos[5]);

const config = {
    host: "localhost",
    port: 5432,
    database: "banco",
    user: "postgres",
    password: "1234",
};
const pool = new Pool(config);

//  Crear una función asíncrona que registre una nueva transferencia utilizando una 
//transacción SQL. Debe mostrar por consola la última transferencia registrada.

const nuevaTransferencia = async (descripcion, fecha, monto, cuenta_origen, cuenta_destino) => {
    try {
        await pool.query("BEGIN");
        // Paso 1
        const descontar = {
            text: "UPDATE cuentas SET saldo = saldo - $1 WHERE id = $2 RETURNING *",
            values: [monto, cuenta_origen]
        };
        const descuento = await pool.query(descontar);
        // Paso 2
        const acreditar = {
            text: "UPDATE cuentas SET saldo = saldo + $1 WHERE id = $2 RETURNING *",
            values: [monto, cuenta_destino]
        };
        const acreditacion = await pool.query(acreditar);
        // Paso 3
        console.log("Descuento realizado con éxito: ", descuento.rows[0]);
        console.log("Acreditación realizada con éxito: ", acreditacion.rows[0]);


        //Hacer todas las consultas con un JSON como argumento del método query
        const insert = {
            text: "INSERT INTO transferencias (descripcion, fecha, monto, cuenta_origen, cuenta_destino) values ($1, $2, $3, $4, $5)",
            values: [descripcion, fecha, monto, cuenta_origen, cuenta_destino]
        };

        const registro = await pool.query(insert);
        console.log(`Transaccion ${descripcion} agregada con éxito`, registro);
        await pool.query("COMMIT");

    } catch (error) {
        await pool.query("ROLLBACK");
        // Capturar los posibles errores en todas las consultas e imprimirlos por consola.
        const { code } = error;
        console.log("Se ha producido un error al insertar el registro : Código del error = ", code, " - ", error.message);
    } finally {
        pool.end();
    }
};

// 2.  Realizar una función asíncrona que consulte la tabla de transferencias y retorne los 
//últimos 10 registros de una cuenta en específico.
const consultaTransferencia = async (cuenta_origen) => {
    try {
        await pool.query("BEGIN");
        const client = await pool.connect()

        const text = "select * from transferencias where cuenta_origen = $1";
        const values = [cuenta_origen]

        const consulta = new Cursor(text, values)
        const cursor = await client.query(consulta)

        cursor.read(10, (err, rows) => {
            console.log(rows);
            cursor.close();
            client.release()
        });
        await pool.query("COMMIT");

    } catch (error) {
        await pool.query("ROLLBACK");
        // Capturar los posibles errores en todas las consultas e imprimirlos por consola.
        const { code } = error;
        console.log("Se ha producido un error al consultar el registro : Código del error = ", code, " - ", error.message);
    } finally {
        pool.end();
    }
};

//3. Realizar una función asíncrona que consulte el saldo de una cuenta en específico
const consultarSaldo = async (cuenta) => {
    try {
        await pool.query("BEGIN");
        const consulta = {
            text: 'SELECT saldo FROM cuentas WHERE id = $1',
            values: [cuenta],
        };
        const result = await pool.query(consulta);
        console.log(`Saldo de la cuenta ${cuenta}:` , result.rows);
        
        await pool.query("COMMIT");
    } catch (error) {
        await pool.query("ROLLBACK");
        console.error('Error al consultar el saldo:', error);
        throw error;
    }
};


//2. Hacer las consultas con texto parametrizado. 
switch (evento) {
    case "nueva":
        // Ejemplo input console node index.js nueva "test" '02-05-2024' 10000 1 2
        nuevaTransferencia(descripcion, fecha, monto, cuenta_origen, cuenta_destino);
        break;
    case "consulta":
        //Ejemplo input console node index.js consulta - - - 1
        consultaTransferencia(cuenta_origen);
        break;
    case "consultaSaldo":
        //Ejemplo input console node index.js consultaSaldo - - - 2
        consultarSaldo(cuenta_origen);
        break;
    default:
        console.log("ingrese parametros validos");
}
