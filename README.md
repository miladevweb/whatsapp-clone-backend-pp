```bash
docker pull postgres
```

```bash
docker run --name postgres_container -d --rm -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_USER=username -e POSTGRES_DB=socket_database -v postgres_data:/var/lib/postgresql/data postgres
```

```bash
npm install prisma -D
npx prisma init --datasource-provider sqlite
npx prisma migrate dev --name init
```
