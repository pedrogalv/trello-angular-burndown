# trello-angular-burndown
A Dashboard project using Angular, Node and Trello API to draw comprehensive management charts, like burndown 

This project was built to create a simple dashboard, making possible each team member to know about the project/sprint health

Want to see a demo from this project? its running in OpenShift [here](http://burndownpedrok-pedrogalv.rhcloud.com/).

This project is still in beta, so any hint, improvement you would like to see or bug spotted, just let me know!

##How to access my account?
1. Click on authorize on the top right, allow trello connect to your account, and press f5 to load your boards.

2. Select a board, inform the initial date, final date and hours per day spent and click in 'Redraw'. The graphs should be redrawn.

##How to interpret?
The burndown is very easy to interpret: The orange line is how your sprint should be running to end exactly in the final date informed.

The blue line is how actually your sprint is running. If it is below the orange line, it means that your Sprint is ahead of the planned. If it is above, it means that your sprint  is lagging behind the project estimated end date 

## Features
- Use trello api to connect to your boards of your account
- Use cloud non-relational database to store the user data provided about its boards, granting all board members to access the same attributes.

## Project components
###For the client part:
- [AngularJS](https://angularjs.org/) 
- [Bower](http://bower.io/)
	* With a ton of packages from github!
- [Gulp](http://gulpjs.com/)

###For the server part: 
- [NodeJS](https://nodejs.org)

##What you have to do in Trello to work:
- Create a list called: "Done" (Without quotes, don't worry about case sensitive)
- Put a number of hours estimated in brackets at the beginning of the title of each card like:
```
(8) this is a task that should be done in 8 hours
```

##Pre-Installation steps:
- Get a trello [developer key](https://trello.com/app-key), they are free.
- Insert the developer key in the following code snippet:
```
(app/public/js/core.js - Line 4)

.config(function(TrelloClientProvider){
  TrelloClientProvider.init({
    key: '<YOUR TRELLO KEY HERE>',
    appName: 'Trello BurnDown Pedroks',
    tokenExpiration: 'never',
    scope: ['read', 'write', 'account'],
  });
})
```

- Create a non relational database, give preference to mongodb, due to the existing connectors in the code. You can create one for free in [mongolab](https://mlab.com).
- Insert the mongodb credentials in the following code snippet:
```
(server.js - Line 13)

mongoose.connect('mongodb://<YOUR MONGODB URL HERE>');
```

- Install Node

- Install Bower globally
```
npm install bower -g 
```

- Install Gulp globally
```
npm install gulp -g 
```


##Installation steps:
```
npm install 
```
(bower install is runned automatically after this)

- If you desire to run it in development mode (with open and clean code):
```
npm run dev
```

- If you desire to run it in production mode (with uglified and minified  code by gulp):
```
npm run start
```

- Open the project in browser, using the port and ip informed: ( Usually is localhost:8088 )

- Follow the access instructions mentioned in 'How to access my account'
