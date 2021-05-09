require('dotenv').config();
const fs = require('fs').promises;
const webdriver = require('selenium-webdriver');

const { By, until } = webdriver;

const axios = require('axios');

async function setupDriver() {
  const SELENIUM_SERVER = 'http://localhost:4444/wd/hub';
  let ready = false;
  let retries = 5;
  while (!ready && retries > 0) { // Wait for selenium to startup
    ready = await axios
      .get(`${SELENIUM_SERVER}/status`)
      .then(response => Boolean(response.data?.value?.ready))
      .catch(() => false);
    retries -= 1;
    // Wait 5 seconds if not ready
    if (!ready) await new Promise(resolve => setTimeout(resolve, 5000));
  }

  if (!ready) throw new Error('Selenium is not responding');
  const driver = await new webdriver.Builder()
    .forBrowser('firefox')
    .usingServer(SELENIUM_SERVER)
    .build();
  await driver.manage().setTimeouts({ implicit: 30000 }); // Milliseconds
  await driver.manage().window().setRect({
    width: 1440, height: 900, x: 10, y: 10,
  });
  return driver;
}

async function login(driver) {
  const url = await driver.getCurrentUrl();
  if (url.endsWith('policy.php')) {
    await driver.findElement(By.css('#notice input[type=submit]')).click();
  }
  const isLoginButtonVisible = await driver.wait(
    until.elementLocated(By.css('.login')),
    5000,
    'No es visible el login',
  ).then(() => true).catch(() => false);
  if (isLoginButtonVisible) {
    await driver.findElement(By.css('.login a')).click();
    await driver.findElement(By.id('username')).sendKeys(process.env.USERNAME);
    await driver.findElement(By.id('password')).sendKeys(process.env.PASSWORD);
    await driver.findElement(By.id('loginbtn')).click();
  }
}

async function parseMembershipsFromFile() {
  return (await fs.readFile('memberships.csv', 'utf8'))
    .split('\n')
    .filter(e => e.trim())
    .map(line => {
      const [group, user] = line.split(';').map(value => value.trim());
      return { user, group };
    })
    .sort((a, b) => a.group.localeCompare(b.group));
}

async function ensureValidCourse(driver) {
  const isCoursePageVisible = await driver.wait(
    until.elementLocated(By.xpath(`//h3[contains(./text(),"${process.env.COURSE_NAME} Grupos")]`)),
    15000,
    `Course title not found or does not match ${process.env.COURSE_NAME}`,
  ).then(() => true).catch(() => false);
  if (!isCoursePageVisible) {
    throw new Error(`Course title not found or does not match ${process.env.COURSE_NAME}`);
  }
}

async function main() {
  const driver = await setupDriver();
  try {
    console.log('start');
    await driver.get(process.env.TARGET);
    await login(driver);
    await ensureValidCourse(driver);
    const memberships = await parseMembershipsFromFile();
    let lastGroup = null;
    for (const { user, group } of memberships) {
      if (lastGroup !== group) {
        if (lastGroup !== null) { // Go back to grop selection and unselect last group
          await driver.findElement(By.css('#backcell > input[type=submit]')).click();
          await driver.findElement(By.xpath(`//select[@id="groups"]/option[starts-with(./text(),"${lastGroup}")]`)).click();
        }
        // Select current group
        await driver.findElement(By.xpath(`//select[@id="groups"]/option[starts-with(./text(),"${group}")]`)).click();
        await driver.findElement(By.id('showaddmembersform')).click();
      }
      lastGroup = group;
      await driver.findElement(By.id('addselect_searchtext')).sendKeys(user);
      const isUserVisible = await driver.wait(
        until.elementLocated(By.css('#addselect option[value]')),
        1000,
        `User ${user} not found in list of users to add`,
      ).then(() => true).catch(() => false);
      if (isUserVisible) {
        await driver.findElement(By.css('#addselect option')).click();
        await driver.findElement(By.id('add')).click();
      } else {
        console.error(`User ${user} not found in list of users to add`);
      }

      await driver.findElement(By.id('addselect_clearbutton')).click();
    }
    console.log('end');
  } catch (error) {
    console.error(error);
    debugger; // eslint-disable-line no-debugger
  } finally {
    driver.quit();
  }
}

main();
