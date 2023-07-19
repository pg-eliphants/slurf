import PG from 'pg';
console.log(Object.keys(PG));
const client = new PG.Client({ user: 'postgres', password: 'postgres' });
await client.connect();
for (let i = 0; i < 500; i++) {
    const res = await client.query('SELECT $1::text as message, CURRENT_TIME', ['Hello world!']);
    console.log(res.rows); // Hello world!
}
await client.end();
