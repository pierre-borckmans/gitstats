export namespace events {
	
	export enum Event {
	    Contributors = "Contributors",
	    Commits = "Commits",
	    ContributorStats = "ContributorStats",
	    AllStats = "AllStats",
	}

}

export namespace stats {
	
	export class CommitDay {
	    date: string;
	    count: number;
	    lines_added: number;
	    lines_removed: number;
	
	    static createFrom(source: any = {}) {
	        return new CommitDay(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.date = source["date"];
	        this.count = source["count"];
	        this.lines_added = source["lines_added"];
	        this.lines_removed = source["lines_removed"];
	    }
	}
	export class Commits {
	    commits_per_day: CommitDay[];
	    total: number;
	
	    static createFrom(source: any = {}) {
	        return new Commits(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.commits_per_day = this.convertValues(source["commits_per_day"], CommitDay);
	        this.total = source["total"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Contributor {
	    name: string;
	    commit_count: number;
	    lines_added: number;
	    lines_removed: number;
	    commits_per_day: CommitDay[];
	
	    static createFrom(source: any = {}) {
	        return new Contributor(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.commit_count = source["commit_count"];
	        this.lines_added = source["lines_added"];
	        this.lines_removed = source["lines_removed"];
	        this.commits_per_day = this.convertValues(source["commits_per_day"], CommitDay);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Stats {
	    contributors: Contributor[];
	
	    static createFrom(source: any = {}) {
	        return new Stats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.contributors = this.convertValues(source["contributors"], Contributor);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

