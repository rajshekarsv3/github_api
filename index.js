var express = require('express');
var http = require('https');
var app = express();
var async = require('async');

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
//Including Github API
var githubApi = require('github');

//Creating object
var github = new githubApi({
	version: "3.0.0",
    debug: true,
    protocol: "https",
    host: "api.github.com", 
    timeout: 5000,
    headers: {
        "user-agent": "rajshekarsv3-GitHub-App" 
    }
});
//Github Authentication is for Increasing API usage. If app is not working fine try changing the username and password here
github.authenticate({
    type: "basic",
    username: 'xyz',
    password: 'xyz'
});

//Check Ajax
app.get('/server',function(request,response){
	//Output object
	var output = {};
	//PAge array for using nodejs async.each
	var page_arr = [];
	//Default value
	output.error = 0;
	//Framing options for HTTPS request
	var url_options = {
		  host: request.query.hostname,
		  path: request.query.pathname,
		  method: 'GET'
		};
	//Cross verify whether its github.com(in case javascript validation fails) and also whether the Repository exists or not
	var req = http.get(url_options, function(res) {
	  if(res.statusCode==404){
	  	output.error = 1;
	  	output.error_reason = 'URL Does not Exist. Please check the URL'
	  	response.send(output);
	  }else
	  {
	  	//Execute this block when URL is correct
	  	var path = request.query.pathname;
	  	//Split path into user and repo names
	  	var details = path.split('/');
	  	var username = details[1];
	  	var reponame = details[2];
	  	var open_issues = {}//Will combine all the open issues into one.
	  	//Get Open issues count of a repo
		github.repos.get({
	    	user: username,
	    	repo: reponame
		}, function(err, res) {
			//check whether the issue is enabled for repository or not
		   if(res.has_issues){
		   	output.open_issues_count=res.open_issues_count
		    if(output.open_issues_count==0)
		    {
		    	output.error = 1;
			  	output.error_reason = 'No Open Issues'
			  	response.send(output);
			  	return;
		    }
		    //Counting no of pages. Adding buffer page
		   	no_of_pages = Math.ceil(res.open_issues_count/100)+1;
		   	console.log(no_of_pages);
		   	//Checking no of pages, because Github ll provide only 100 open issues per api cal
		   	for(i=0;i<no_of_pages;i++){
		   		page_arr[i] = i+1;
		   	}
		   	//Making Call for all the page
		    async.each(page_arr,function(i,_callback){
		   		console.log(i)
		   		github.issues.repoIssues({
			   		user: username,
		    		repo: reponame,
		    		page: i,
		    		per_page: 100,
		    		state: 'open',
			   	},function(err,res){
					for( k in res){
			   			//Framing key using page number and objects' position
			   			key = ((i-1)*100)+parseInt(k)+1
			   			//combining all the output in to one
			   			if(!isNaN(key))
			   				open_issues[key] = res[k]
			   		}
			   		//Callback executed when all the pages completed
			   		_callback()
			   	})
			   	
		   	},function(err){
		   		//Callback starts here
		   		output.current_date = new Date().toISOString();
		   		output.before_24hrs = new Date(new Date().getTime() - (24 * 60 * 60 * 1000)).toISOString();
		   		output.before_7days = new Date(new Date().getTime() - (7*24 * 60 * 60 * 1000)).toISOString();
		   		output.total_count =0;
		   		output.total_issues_count =0;
		   		output.total_pull_count =0;
		   		output.total_count_24h =0;
		   		output.total_issues_count_24h =0;
		   		output.total_pull_count_24h =0;
		   		output.total_count_7d =0;
		   		output.total_issues_count_7d =0;
		   		output.total_pull_count_7d =0;
		   		output.total_count_o =0;
		   		output.total_issues_count_o =0;
		   		output.total_pull_count_o =0;
		   		for (var key in open_issues) {
				  if (open_issues.hasOwnProperty(key)) {
				  	output.total_count++;
				  	//Checing whether issue or pull requesy
				  	type=open_issues[key].html_url.split('/')[5]
				  	type=='issues'?output.total_issues_count++:output.total_pull_count++
				    if(open_issues[key].created_at>output.before_24hrs){
				    	output.total_count_24h++
				    	type=='issues'?output.total_issues_count_24h++:output.total_pull_count_24h++
				    }else if(open_issues[key].created_at<output.before_24hrs && open_issues[key].created_at>output.before_7days){
				    	output.total_count_7d++
				    	type=='issues'?output.total_issues_count_7d++:output.total_pull_count_7d++
				    }else if(open_issues[key].created_at<output.before_7days){
				    	output.total_count_o++
				    	type=='issues'?output.total_issues_count_o++:output.total_pull_count_o++
				    }
				  }
				}
				response.send(output);
		   	})
		   }else{
		   	output.error = 1;
		  	output.error_reason = 'This Repository does not have Issues Enabled'
		  	response.send(output);
		   }
		   
		});
	  }
	});


})



