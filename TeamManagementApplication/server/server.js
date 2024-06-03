//Server logic 

Meteor.publish("teams", function(){
    return Teams.find({$or : [{invitedID : this.userId}, {createdByID: this.userId}] });
});
Meteor.publish("issues", function(teamID){
    return Issues.find({tID: teamID});
});

Meteor.publish("users", function() { 
  return Meteor.users.find({}, {fields: {}});
});


Accounts.onCreateUser(function(options, user) {
  
  user.Team = {"inTeam":false, "inTeamID":"", "inTeamTitle":""};
  if (options.profile)
    user.profile = options.profile;
  return user;
});

Meteor.methods({
  UpdateUserTeamInfoToInside: function (teamID, teamTitle) {
    var teamCreator = Teams.findOne({_id: teamID}).createdByID;
    teamCreator = Meteor.users.findOne({_id: teamCreator}).username;
    Meteor.users.update( { _id:Meteor.userId() },
			 { $set:{ Team: {"inTeam":true , "inTeamID":teamID, "inTeamTitle":teamTitle,
                                         "inTeamCreator": teamCreator} } } );
    Teams.update({_id:teamID},{$push:{peopleID:Meteor.userId() , peopleUsername:Meteor.user().username}});
  },
  UpdateUserTeamInfoToOutside: function (teamID) {
    Meteor.users.update( { _id:Meteor.userId() }, { $set:{ Team:{"inTeamID":'', "inTeamTitle":'', "inTeam":false} } });
    Teams.update({_id:teamID},{$pull:{ peopleID:Meteor.userId(), peopleUsername:Meteor.user().username }});
  },
  DeleteTeam: function (teamID) {
    Teams.remove({_id:teamID});
      Issues.remove({tID: teamID});  
  },
  DeleteIssue: function (issue_ID) {
    Issues.remove({_id:issue_ID});
  }
});
