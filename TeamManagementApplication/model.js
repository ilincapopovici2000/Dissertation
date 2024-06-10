// Shared code (client + server)

Teams = new Meteor.Collection('teams');
/*  
_id,
 teamTitle,
 peopleID: list of ids of currently online users,
 peopleUsername: list of usernames of currently online users,
 invitedID : list of ids of users invited to this team,
 createdByID: user id creator
 teamPrinc
 */

Issues = new Meteor.Collection('issues');
/* 
 _id,
 tID: team id,
 teamprinc,
 teamTitle,
 issue,
 issueType: bug/extention
 issueStatus: open/inProgress/closed
 userInCharge: user who handles the issue
 userID: id of user sender,
 username: username of sender,
 time: time when issue was sent
 */

Issues._encrypted_fields({
    'issue': {
        princ: 'teamprinc',
        princtype: 'team',
        auth: ['_id']
    },
    'issueType': {
        princ: 'teamprinc',
        princtype: 'team',
        auth: ['_id']
    },
    'userInCharge': {
        princ: 'teamprinc',
        princtype: 'team',
        auth: ['_id']
    }
});
Issues._immutable({teamprinc: ['tID', 'teamTitle', '_id']});


// important for the IDP, so it get the _wrapped_pk fields of the user doc
Meteor.startup(function () {
    // pub
    if (Meteor.isServer) {
        Meteor.publish("users", function () {
            return Meteor.users.find(this.userId, {fields: {}});
        });
    }
    // sub
    if (Meteor.isClient) {
        Tracker.autorun(function () {
            Meteor.subscribe("users");
        })
    }
})


/* trusted IDP: */
//var idp_pub = '8a7fe03431b5fc2db3923a2ab6d1a5ddf35cd64aea35e743' +
//              'ded7655f0dc7e085858eeec06e1c7da58c509d57da56dbe6';
//idp_init("http://localhost:3000", idp_pub, false);

// use IDP only if active attacker
Accounts.config({sendVerificationEmail: active_attacker()});


if (Meteor.isServer) {
    Teams.allow({
        // anyone can insert a new team
        insert: function (userId, doc) {
            return true;
        },
        // only owner can change team
        update: function (userId, doc) {
            return doc.createdByID === userId;
        },
        // only owner can remove team
        remove: function (userId, doc) {
            return doc.createdByID === userId;
        }
    });

    Issues.allow({
        // can only insert an issue in a team if you have access to the team
        insert: function (userId, doc) {
            var team = Teams.findOne({_id: doc.tID});
            return team.createdByID == userId || _.contains(team.invitedID, userId);
        },

        // can only update an issue in a team if you have access to the team
        update: function (userId, doc) {
            var team = Teams.findOne({_id: doc.tID});
            return team.createdByID == userId || _.contains(team.invitedID, userId);
        },

        // no one can delete issues
        remove: function (userId, doc) {
            return false;
        }
    });

    filter = function (userID) {
        // create a list of all the teams this user has access to
        var teams = Teams.find({$or: [
            {createdByID: userID},
            {invitedID: userID}
        ]
        }).fetch();
        var filters = [];
        _.each(teams, function (team) {
            filters.push({tID: team._id});
        });

        return filters;
    };

}


