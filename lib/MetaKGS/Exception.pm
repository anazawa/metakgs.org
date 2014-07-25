package MetaKGS::Exception;
use strict;
use warnings;

use Exception::Class (
    'MetaKGS::Exception',
    'MetaKGS::Exception::FormValidator' => {
        isa => 'MetaKGS::Exception',
        fields => [qw(result)],
    },
);

package MetaKGS::Exception::FormValidator;

sub full_message {
    my $self = shift;

    my @errors;

    if ( my @missings = $self->result->missing ) {
        push @errors, "'" . join("' and '", @missings) . "' are missing.";
    }

    if ( my @invalids = $self->result->invalid ) {
        push @errors, "'" . join("' and '", @invalids) . "' are invalid.";
    }

    my $error = $self->error || 'Validation failed';
       $error .= ': '. join ' ', @errors if @errors;

    $error;
}

1;
