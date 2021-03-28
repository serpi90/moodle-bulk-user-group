# Moodle Bulk Updater

## Configure

Create a `.env` file:

```plain
TARGET=https://moodle.example.com/group/index.php?id=2302
COURSE_NAME=Group tame in courses tree

USERNAME=<your user>
PASSWORD=<your pass>
```

- `TARGET` should point to the group edition page for the course (2302 in the example is the course id).
- `COURSE_NAME` is the course name as it appears on the course tree. I'ts used to validate that the TARGET is correct.

Create a file named memberships.csv containing `group_name;user_email` one per line.

```csv
Grupo A1;a@hotmail.com
Grupo A1;b@gmail.com
Grupo A1;c@yahoo.com
Grupo A1;d@gmail.com
Grupo A2;e@hotmail.com
Grupo A2;a@hotmail.com
```

## Run

You need docker, docker-compose and nodejs (v15 or greater)

Ensure the groups are created beforehand, this only adds users to exisiting groups.

1. `docker-compose up -d` to start a selenium server (firefox)
2. (optional, to see progress) connect to the selenium server via VNC (remmina can) to: `localhost:5900` pass: `secret`
3. Run `node index.js` or debug with vscode
4. `docker-compose down` to stop selenium
